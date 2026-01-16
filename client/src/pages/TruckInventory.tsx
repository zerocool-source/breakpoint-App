import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  PackagePlus,
  Truck,
  Plus,
  Minus,
  Trash2,
  Search,
  AlertTriangle,
  Filter,
} from "lucide-react";
import type { FleetTruck, TruckInventory as TruckInventoryType } from "@shared/schema";

const TRUCK_INVENTORY_CATEGORIES = [
  "Chemicals",
  "Tools",
  "Parts",
  "Safety Equipment",
  "Cleaning Supplies",
  "Test Equipment",
  "Other"
];

export default function TruckInventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<FleetTruck | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [newInventoryItem, setNewInventoryItem] = useState({
    itemName: "",
    category: "Chemicals",
    quantity: 0,
    unit: "each",
    minQuantity: 0,
    notes: "",
  });

  const { data: trucks = [] } = useQuery<FleetTruck[]>({
    queryKey: ["/api/fleet/trucks"],
  });

  const { data: inventoryItems = [] } = useQuery<TruckInventoryType[]>({
    queryKey: ["/api/fleet/inventory"],
  });

  const addInventoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/fleet/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add inventory item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/inventory"] });
      setInventoryModalOpen(false);
      setSelectedTruck(null);
      setNewInventoryItem({ itemName: "", category: "Chemicals", quantity: 0, unit: "each", minQuantity: 0, notes: "" });
      toast({ title: "Inventory item added" });
    },
    onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TruckInventoryType> }) => {
      const res = await fetch(`/api/fleet/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/inventory"] });
    },
  });

  const deleteInventoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/fleet/inventory/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/inventory"] });
      toast({ title: "Item deleted" });
    },
  });

  const getInventoryForTruck = (truckId: string) => {
    return inventoryItems.filter(item => item.truckId === truckId);
  };

  const lowStockItems = inventoryItems.filter(item => item.quantity <= (item.minQuantity || 0));

  const filteredInventory = inventoryItems.filter(item => {
    const matchesSearch = !searchQuery || 
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trucks.find(t => t.id === item.truckId)?.truckNumber.toString().includes(searchQuery);
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const groupedByTruck = trucks.map(truck => ({
    truck,
    items: filteredInventory.filter(item => item.truckId === truck.id)
  })).filter(group => group.items.length > 0 || !searchQuery);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Truck Inventory</h1>
            <p className="text-sm text-slate-500">Manage supplies and equipment for each truck</p>
          </div>
          <Button onClick={() => setInventoryModalOpen(true)} data-testid="button-add-inventory">
            <PackagePlus className="h-4 w-4 mr-2" />
            Add Inventory Item
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white shadow-sm">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0078D4]1A rounded-lg">
                  <Package className="h-5 w-5 text-[#0078D4]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inventoryItems.length}</p>
                  <p className="text-sm text-slate-500">Total Items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#22D69A]1A rounded-lg">
                  <Truck className="h-5 w-5 text-[#22D69A]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{trucks.length}</p>
                  <p className="text-sm text-slate-500">Trucks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
                  <p className="text-sm text-slate-500">Low Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#17BEBB]1A rounded-lg">
                  <Filter className="h-5 w-5 text-[#17BEBB]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{TRUCK_INVENTORY_CATEGORIES.length}</p>
                  <p className="text-sm text-slate-500">Categories</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search items or truck number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-inventory"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48" data-testid="select-category-filter">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {TRUCK_INVENTORY_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {lowStockItems.length > 0 && (
          <Card className="bg-red-50 border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Low Stock Alerts ({lowStockItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.map(item => {
                  const truck = trucks.find(t => t.id === item.truckId);
                  return (
                    <Badge key={item.id} variant="outline" className="bg-white border-red-200 text-red-700">
                      Truck #{truck?.truckNumber}: {item.itemName} ({item.quantity} left)
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {trucks.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="py-12 text-center">
                <Truck className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-700">No Trucks Available</h3>
                <p className="text-sm text-slate-500 mt-1">Add trucks in Fleet Dashboard to manage inventory.</p>
              </CardContent>
            </Card>
          ) : (
            groupedByTruck.map(({ truck, items }) => (
              <Card key={truck.id} className="bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#0078D4]1A rounded-lg">
                        <Truck className="h-5 w-5 text-[#0078D4]" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Truck #{truck.truckNumber}</CardTitle>
                        <p className="text-sm text-slate-500">
                          {items.length} items tracked
                          {items.filter(i => i.quantity <= (i.minQuantity || 0)).length > 0 && (
                            <span className="text-red-600 ml-2">
                              • {items.filter(i => i.quantity <= (i.minQuantity || 0)).length} low stock
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTruck(truck);
                        setInventoryModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-sm text-slate-400 italic py-4 text-center">No inventory items tracked for this truck</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg border ${
                            item.quantity <= (item.minQuantity || 0)
                              ? 'bg-red-50 border-red-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-slate-800">{item.itemName}</p>
                              <p className="text-xs text-slate-500">{item.category}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                              onClick={() => deleteInventoryMutation.mutate(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => updateInventoryMutation.mutate({
                                  id: item.id,
                                  updates: { quantity: Math.max(0, item.quantity - 1) }
                                })}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className={`font-bold text-lg min-w-[2rem] text-center ${
                                item.quantity <= (item.minQuantity || 0) ? 'text-red-600' : 'text-slate-800'
                              }`}>
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => updateInventoryMutation.mutate({
                                  id: item.id,
                                  updates: { quantity: item.quantity + 1 }
                                })}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="text-xs text-slate-500">{item.unit}</span>
                          </div>
                          {item.minQuantity && item.minQuantity > 0 && (
                            <p className="text-xs text-slate-400 mt-1">
                              Min: {item.minQuantity}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={inventoryModalOpen} onOpenChange={(open) => {
        setInventoryModalOpen(open);
        if (!open) {
          setSelectedTruck(null);
          setNewInventoryItem({ itemName: "", category: "Chemicals", quantity: 0, unit: "each", minQuantity: 0, notes: "" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#0078D4]" />
              Add Inventory Item
            </DialogTitle>
            <DialogDescription>Add a new item to truck inventory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Truck</Label>
              <Select 
                value={selectedTruck?.id || ""} 
                onValueChange={(v) => setSelectedTruck(trucks.find(t => t.id === v) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select truck" />
                </SelectTrigger>
                <SelectContent>
                  {trucks.map(t => (
                    <SelectItem key={t.id} value={t.id}>Truck #{t.truckNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Item Name</Label>
              <Input 
                value={newInventoryItem.itemName}
                onChange={(e) => setNewInventoryItem({ ...newInventoryItem, itemName: e.target.value })}
                placeholder="e.g., Chlorine Tablets, Test Strips..."
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select 
                value={newInventoryItem.category} 
                onValueChange={(v) => setNewInventoryItem({ ...newInventoryItem, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRUCK_INVENTORY_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input 
                  type="number"
                  min={0}
                  value={newInventoryItem.quantity}
                  onChange={(e) => setNewInventoryItem({ ...newInventoryItem, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select 
                  value={newInventoryItem.unit} 
                  onValueChange={(v) => setNewInventoryItem({ ...newInventoryItem, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="each">Each</SelectItem>
                    <SelectItem value="lbs">Lbs</SelectItem>
                    <SelectItem value="gallons">Gallons</SelectItem>
                    <SelectItem value="cases">Cases</SelectItem>
                    <SelectItem value="boxes">Boxes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Minimum Quantity (for low stock alert)</Label>
              <Input 
                type="number"
                min={0}
                value={newInventoryItem.minQuantity}
                onChange={(e) => setNewInventoryItem({ ...newInventoryItem, minQuantity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea 
                value={newInventoryItem.notes}
                onChange={(e) => setNewInventoryItem({ ...newInventoryItem, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInventoryModalOpen(false)}>Cancel</Button>
            <Button 
              disabled={!selectedTruck || !newInventoryItem.itemName}
              onClick={() => {
                if (selectedTruck && newInventoryItem.itemName) {
                  addInventoryMutation.mutate({
                    truckId: selectedTruck.id,
                    truckNumber: selectedTruck.truckNumber,
                    itemName: newInventoryItem.itemName,
                    category: newInventoryItem.category,
                    quantity: newInventoryItem.quantity,
                    unit: newInventoryItem.unit,
                    minQuantity: newInventoryItem.minQuantity,
                    notes: newInventoryItem.notes || null,
                  });
                }
              }}
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
