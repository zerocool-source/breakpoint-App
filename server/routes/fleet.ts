import type { Request, Response } from "express";
import { storage } from "../storage";
import { onestepgps, reverseGeocode } from "../lib/onestepgps";

export function registerFleetRoutes(app: any) {
  // ==================== FLEET MANAGEMENT ====================

  app.get("/api/fleet/trucks", async (req: Request, res: Response) => {
    try {
      const trucks = await storage.getFleetTrucks();
      res.json(trucks);
    } catch (error: any) {
      console.error("Error getting fleet trucks:", error);
      res.status(500).json({ error: "Failed to get fleet trucks" });
    }
  });

  app.get("/api/fleet/trucks/:id", async (req: Request, res: Response) => {
    try {
      const truck = await storage.getFleetTruck(req.params.id);
      if (!truck) {
        return res.status(404).json({ error: "Truck not found" });
      }
      res.json(truck);
    } catch (error: any) {
      console.error("Error getting truck:", error);
      res.status(500).json({ error: "Failed to get truck" });
    }
  });

  app.post("/api/fleet/trucks", async (req: Request, res: Response) => {
    try {
      const truck = await storage.createFleetTruck(req.body);
      res.json(truck);
    } catch (error: any) {
      console.error("Error creating truck:", error);
      res.status(500).json({ error: "Failed to create truck" });
    }
  });

  app.put("/api/fleet/trucks/:id", async (req: Request, res: Response) => {
    try {
      const truck = await storage.updateFleetTruck(req.params.id, req.body);
      res.json(truck);
    } catch (error: any) {
      console.error("Error updating truck:", error);
      res.status(500).json({ error: "Failed to update truck" });
    }
  });

  app.get("/api/fleet/maintenance", async (req: Request, res: Response) => {
    try {
      const { truckId, truckNumber } = req.query;
      let records;
      if (truckId) {
        records = await storage.getFleetMaintenanceRecordsByTruck(truckId as string);
      } else if (truckNumber) {
        records = await storage.getFleetMaintenanceRecordsByTruckNumber(parseInt(truckNumber as string));
      } else {
        records = await storage.getFleetMaintenanceRecords();
      }
      res.json(records);
    } catch (error: any) {
      console.error("Error getting maintenance records:", error);
      res.status(500).json({ error: "Failed to get maintenance records" });
    }
  });

  app.post("/api/fleet/maintenance", async (req: Request, res: Response) => {
    try {
      const record = await storage.createFleetMaintenanceRecord(req.body);
      res.json(record);
    } catch (error: any) {
      console.error("Error creating maintenance record:", error);
      res.status(500).json({ error: "Failed to create maintenance record" });
    }
  });

  app.get("/api/fleet/stats", async (req: Request, res: Response) => {
    try {
      const trucks = await storage.getFleetTrucks();
      const records = await storage.getFleetMaintenanceRecords();
      
      const stats = {
        totalTrucks: trucks.length,
        activeTrucks: trucks.filter(t => t.isActive).length,
        totalMaintenanceRecords: records.length,
        recentServices: records.slice(0, 10),
      };
      res.json(stats);
    } catch (error: any) {
      console.error("Error getting fleet stats:", error);
      res.status(500).json({ error: "Failed to get fleet stats" });
    }
  });

  app.post("/api/fleet/seed", async (req: Request, res: Response) => {
    try {
      const { trucks, maintenanceRecords } = req.body;
      let trucksCreated = 0;
      let recordsCreated = 0;

      const truckIdMap: Record<number, string> = {};
      
      for (const truck of trucks) {
        const upserted = await storage.upsertFleetTruck(truck.truckNumber, truck);
        truckIdMap[truck.truckNumber] = upserted.id;
        trucksCreated++;
      }

      for (const record of maintenanceRecords) {
        const truckId = truckIdMap[record.truckNumber];
        if (truckId) {
          await storage.createFleetMaintenanceRecord({
            ...record,
            truckId,
          });
          recordsCreated++;
        }
      }

      res.json({ trucksCreated, recordsCreated });
    } catch (error: any) {
      console.error("Error seeding fleet data:", error);
      res.status(500).json({ error: "Failed to seed fleet data" });
    }
  });

  // ==================== TRUCK INVENTORY ====================

  app.get("/api/fleet/inventory/:truckId", async (req: Request, res: Response) => {
    try {
      const { truckId } = req.params;
      const inventory = await storage.getTruckInventory(truckId);
      res.json(inventory);
    } catch (error: any) {
      console.error("Error getting truck inventory:", error);
      res.status(500).json({ error: "Failed to get truck inventory" });
    }
  });

  app.get("/api/fleet/inventory", async (req: Request, res: Response) => {
    try {
      const inventory = await storage.getAllTruckInventory();
      res.json(inventory);
    } catch (error: any) {
      console.error("Error getting all inventory:", error);
      res.status(500).json({ error: "Failed to get all inventory" });
    }
  });

  app.get("/api/fleet/inventory-low-stock", async (req: Request, res: Response) => {
    try {
      const lowStock = await storage.getLowStockItems();
      res.json(lowStock);
    } catch (error: any) {
      console.error("Error getting low stock items:", error);
      res.status(500).json({ error: "Failed to get low stock items" });
    }
  });

  app.post("/api/fleet/inventory", async (req: Request, res: Response) => {
    try {
      const item = await storage.createTruckInventoryItem(req.body);
      res.json(item);
    } catch (error: any) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ error: "Failed to create inventory item" });
    }
  });

  app.put("/api/fleet/inventory/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateTruckInventoryItem(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ error: "Failed to update inventory item" });
    }
  });

  app.delete("/api/fleet/inventory/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteTruckInventoryItem(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ error: "Failed to delete inventory item" });
    }
  });

  // ==================== GPS TRACKING (OneStepGPS) ====================

  // Test OneStepGPS connection
  app.get("/api/fleet/gps/test-connection", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.ONESTEPGPS_API_KEY;
      if (!apiKey) {
        return res.json({ 
          connected: false, 
          configured: false,
          message: "OneStepGPS API key not configured. Add ONESTEPGPS_API_KEY to your secrets." 
        });
      }

      const data = await onestepgps.getDevices();
      res.json({ 
        connected: true, 
        configured: true,
        deviceCount: data.result_list?.length || 0,
        message: `Successfully connected. Found ${data.result_list?.length || 0} devices.` 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('OneStepGPS connection test failed:', errorMessage);
      res.json({ 
        connected: false, 
        configured: true,
        message: `Connection failed: ${errorMessage}` 
      });
    }
  });

  // Check GPS configuration status
  app.get("/api/fleet/gps/status", async (req: Request, res: Response) => {
    const apiKey = process.env.ONESTEPGPS_API_KEY;
    res.json({ 
      configured: !!apiKey,
      keyLength: apiKey ? apiKey.length : 0
    });
  });

  app.get("/api/fleet/gps/devices", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.ONESTEPGPS_API_KEY;
      if (!apiKey) {
        return res.json({ 
          devices: [], 
          summary: { total: 0, active: 0, inShop: 0, inactive: 0 },
          configured: false,
          message: "OneStepGPS API key not configured"
        });
      }

      const data = await onestepgps.getDevices();
      
      const devices = (data.result_list || []).map(device => ({
        id: device.device_id,
        name: device.display_name,
        online: device.online,
        status: device.active_state === 'active' ? 'Active' : device.active_state === 'inactive' ? 'Inactive' : 'In Shop',
        location: {
          lat: device.latest_device_point?.lat || 0,
          lng: device.latest_device_point?.lng || 0,
        },
        speed: device.latest_device_point?.speed || 0,
        heading: device.latest_device_point?.heading || 0,
        odometer: device.latest_device_point?.params?.odometer || 0,
        engineHours: device.latest_device_point?.params?.engine_hours || 0,
        fuelLevel: device.latest_device_point?.params?.fuel_level,
        ignition: device.latest_device_point?.params?.ignition || false,
        lastUpdate: device.latest_device_point?.dt_tracker,
      }));

      const summary = {
        total: devices.length,
        active: devices.filter(d => d.online && d.status === 'Active').length,
        inShop: devices.filter(d => d.status === 'In Shop').length,
        inactive: devices.filter(d => !d.online || d.status === 'Inactive').length,
      };

      res.json({ devices, summary, configured: true });
    } catch (error) {
      console.error('Fleet GPS devices error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Return empty data with error info instead of 500 error
      res.json({ 
        devices: [], 
        summary: { total: 0, active: 0, inShop: 0, inactive: 0 },
        configured: true,
        error: true,
        message: errorMessage.includes('400') 
          ? 'Invalid API key. Please check your OneStepGPS API key in Settings.'
          : `GPS Error: ${errorMessage}`
      });
    }
  });

  app.get("/api/fleet/gps/geofence-events", async (req: Request, res: Response) => {
    try {
      const deviceId = req.query.deviceId as string | undefined;
      const startDate = (req.query.startDate as string) || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = (req.query.endDate as string) || new Date().toISOString();

      const data = await onestepgps.getGeofenceEvents({
        deviceId,
        startDate,
        endDate,
        limit: 100,
      });

      res.json({ events: data.result_list });
    } catch (error) {
      console.error('Geofence events error:', error);
      res.status(500).json({ error: 'Failed to fetch geofence events' });
    }
  });

  app.get("/api/fleet/gps/alerts", async (req: Request, res: Response) => {
    try {
      const deviceId = req.query.deviceId as string | undefined;
      const startDate = (req.query.startDate as string) || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = (req.query.endDate as string) || new Date().toISOString();

      const data = await onestepgps.getDriveEvents({
        deviceId,
        startDate,
        endDate,
        limit: 100,
      });

      const alerts = data.result_list.map(event => ({
        id: event.event_id,
        deviceId: event.device_id,
        type: event.event_type as string,
        severity: event.severity,
        timestamp: event.timestamp,
        location: { lat: event.lat, lng: event.lng },
        details: event.details,
      }));

      const maintenanceAlerts = {
        overdue: alerts.filter(a => a.type === 'maintenance_overdue').length,
        dueThisWeek: alerts.filter(a => a.type === 'maintenance_due').length,
      };

      res.json({ alerts, maintenanceAlerts });
    } catch (error) {
      console.error('Fleet alerts error:', error);
      res.status(500).json({ error: 'Failed to fetch fleet alerts' });
    }
  });

  app.get("/api/fleet/gps/geofences", async (req: Request, res: Response) => {
    try {
      const data = await onestepgps.getGeofences();
      
      const geofences = data.result_list.map(geofence => ({
        id: geofence.geofence_id,
        name: geofence.name,
        type: geofence.type,
        coordinates: geofence.coordinates,
        radius: geofence.radius,
        createdAt: geofence.created_at,
      }));

      res.json({ geofences });
    } catch (error) {
      console.error('Geofences error:', error);
      res.status(500).json({ error: 'Failed to fetch geofences' });
    }
  });

  app.get("/api/fleet/gps/devices-detailed", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.ONESTEPGPS_API_KEY;
      if (!apiKey) {
        return res.json({ 
          devices: [], 
          summary: { total: 0, driving: 0, idle: 0, offline: 0 },
          configured: false,
          message: "OneStepGPS API key not configured"
        });
      }

      const data = await onestepgps.getDevices();
      
      const devices = await Promise.all((data.result_list || []).map(async device => {
        const lat = device.latest_device_point?.lat || 0;
        const lng = device.latest_device_point?.lng || 0;
        const speed = device.latest_device_point?.speed || 0;
        const ignition = device.latest_device_point?.params?.ignition || false;
        
        let status: 'driving' | 'idle' | 'offline' = 'offline';
        let statusDuration = '';
        
        if (!device.online) {
          status = 'offline';
        } else if (speed > 2 && ignition) {
          status = 'driving';
        } else if (ignition) {
          status = 'idle';
        }
        
        const lastUpdateTime = device.latest_device_point?.dt_tracker;
        if (lastUpdateTime) {
          const diffMs = Date.now() - new Date(lastUpdateTime).getTime();
          const mins = Math.floor(diffMs / 60000);
          const secs = Math.floor((diffMs % 60000) / 1000);
          statusDuration = `${mins}m ${secs}s`;
        }

        const address = device.latest_device_point?.formatted_address || 
                        device.latest_device_point?.address || 
                        null;

        const cellSignal = device.latest_device_point?.params?.cell_signal;
        let cellSignalLabel = 'Unknown';
        if (cellSignal !== undefined) {
          if (cellSignal >= 75) cellSignalLabel = 'Excellent';
          else if (cellSignal >= 50) cellSignalLabel = 'Good';
          else if (cellSignal >= 25) cellSignalLabel = 'Normal';
          else cellSignalLabel = 'Weak';
        }

        const gpsAccuracy = device.latest_device_point?.params?.gps_accuracy;
        let gpsAccuracyLabel = 'Unknown';
        if (gpsAccuracy !== undefined) {
          if (gpsAccuracy <= 5) gpsAccuracyLabel = 'Excellent';
          else if (gpsAccuracy <= 10) gpsAccuracyLabel = 'Good';
          else if (gpsAccuracy <= 20) gpsAccuracyLabel = 'Fair';
          else gpsAccuracyLabel = 'Poor';
        }

        return {
          id: device.device_id,
          name: device.display_name,
          online: device.online,
          status,
          statusDuration,
          location: { lat, lng },
          address,
          speed: Math.round(speed),
          odometer: device.latest_device_point?.params?.odometer || 0,
          engineHours: device.latest_device_point?.params?.engine_hours || 0,
          voltage: device.latest_device_point?.params?.battery_voltage || 0,
          backupVoltage: device.latest_device_point?.params?.backup_voltage,
          fuelLevel: device.latest_device_point?.params?.fuel_level,
          ignition,
          lastUpdate: lastUpdateTime,
          vin: device.vin || null,
          licensePlate: device.license_plate || null,
          driverName: device.driver_name || null,
          deviceGroups: device.device_groups || [],
          cellSignal: cellSignalLabel,
          gpsAccuracy: gpsAccuracyLabel,
          rssi: device.latest_device_point?.params?.rssi || null,
          make: device.make || null,
          model: device.model || null,
          year: device.year || null,
        };
      }));

      const summary = {
        total: devices.length,
        driving: devices.filter(d => d.status === 'driving').length,
        idle: devices.filter(d => d.status === 'idle').length,
        offline: devices.filter(d => d.status === 'offline').length,
      };

      res.json({ devices, summary, configured: true });
    } catch (error) {
      console.error('Fleet GPS detailed devices error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      res.json({ 
        devices: [], 
        summary: { total: 0, driving: 0, idle: 0, offline: 0 },
        configured: true,
        error: true,
        message: errorMessage.includes('400') 
          ? 'Invalid API key. Please check your OneStepGPS API key in Settings.'
          : `GPS Error: ${errorMessage}`
      });
    }
  });

  app.get("/api/fleet/gps/trips/:deviceId", async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      
      const startDate = `${date}T00:00:00Z`;
      const endDate = `${date}T23:59:59Z`;
      
      const tripData = await onestepgps.getTrips(deviceId, startDate, endDate);
      
      const trips = (tripData.result_list || []).map((trip: any, index: number) => ({
        id: trip.trip_id || `trip-${index}`,
        startTime: trip.start_time,
        endTime: trip.end_time,
        startAddress: trip.start_address || null,
        endAddress: trip.end_address || null,
        startLocation: { lat: trip.start_lat, lng: trip.start_lng },
        endLocation: { lat: trip.end_lat, lng: trip.end_lng },
        distanceMiles: trip.distance_miles || 0,
        durationSeconds: trip.duration_seconds || 0,
        maxSpeed: trip.max_speed || 0,
        avgSpeed: trip.avg_speed || 0,
        idleTimeSeconds: trip.idle_time_seconds || 0,
        stopsCount: trip.stops_count || 0,
      }));

      const totalDistance = trips.reduce((sum: number, t: any) => sum + t.distanceMiles, 0);
      const totalIdleTime = trips.reduce((sum: number, t: any) => sum + t.idleTimeSeconds, 0);
      const totalEngineTime = trips.reduce((sum: number, t: any) => sum + t.durationSeconds, 0);
      const totalStops = trips.reduce((sum: number, t: any) => sum + t.stopsCount, 0);

      res.json({
        trips,
        summary: {
          date,
          totalTrips: trips.length,
          totalDistance: Math.round(totalDistance * 10) / 10,
          totalIdleTime,
          totalEngineTime,
          totalStops,
        }
      });
    } catch (error) {
      console.error('Fleet GPS trips error:', error);
      res.json({
        trips: [],
        summary: {
          date: req.query.date || new Date().toISOString().split('T')[0],
          totalTrips: 0,
          totalDistance: 0,
          totalIdleTime: 0,
          totalEngineTime: 0,
          totalStops: 0,
        },
        error: true,
        message: 'Failed to fetch trip data'
      });
    }
  });

  app.get("/api/fleet/gps/device/:deviceId/address", async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }
      
      const address = await reverseGeocode(lat, lng);
      res.json({ address });
    } catch (error) {
      console.error('Reverse geocode error:', error);
      res.status(500).json({ error: 'Failed to get address' });
    }
  });
}
