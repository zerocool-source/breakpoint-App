import { Request, Response } from "express";
import { storage } from "../storage";

export function registerSyncRoutes(app: any) {
  app.get('/api/sync/properties', async (req: Request, res: Response) => {
    try {
      const properties = await storage.getProperties();
      res.json({ properties });
    } catch (error: any) {
      console.error('Error fetching properties for sync:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/sync/technicians', async (req: Request, res: Response) => {
    try {
      const technicians = await storage.getTechnicians();
      res.json({ technicians });
    } catch (error: any) {
      console.error('Error fetching technicians for sync:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/sync/routes', async (req: Request, res: Response) => {
    try {
      const routes = await storage.getRoutes();
      res.json({ routes });
    } catch (error: any) {
      console.error('Error fetching routes for sync:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/sync/route-stops', async (req: Request, res: Response) => {
    try {
      const date = req.query.date as string | undefined;
      const stops = date 
        ? await storage.getRouteStopsByDate(date)
        : await storage.getAllRouteStops();
      res.json({ stops });
    } catch (error: any) {
      console.error('Error fetching route stops for sync:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/sync/field-entries', async (req: Request, res: Response) => {
    try {
      const entries = await storage.getFieldEntries();
      res.json({ entries });
    } catch (error: any) {
      console.error('Error fetching field entries for sync:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/sync/field-entries', async (req: Request, res: Response) => {
    try {
      const { entry } = req.body;
      if (!entry) {
        return res.status(400).json({ error: 'entry required' });
      }
      
      const entryType = entry.entryType || entry.entry_type || entry.serviceType || entry.service_type || 'service';
      
      const payloadData: Record<string, any> = {};
      if (entry.notes) payloadData.notes = entry.notes;
      if (entry.serviceType || entry.service_type) payloadData.serviceType = entry.serviceType || entry.service_type;
      if (entry.propertyName || entry.property_name) payloadData.propertyName = entry.propertyName || entry.property_name;
      if (entry.readings) payloadData.readings = entry.readings;
      if (entry.photos) payloadData.photos = entry.photos;
      if (entry.timestamp) payloadData.timestamp = entry.timestamp;
      
      if (entry.payload && typeof entry.payload === 'object') {
        Object.assign(payloadData, entry.payload);
      }
      
      const mappedEntry = {
        routeStopId: entry.routeStopId || entry.route_stop_id || null,
        propertyId: entry.propertyId || entry.property_id || null,
        technicianId: entry.technicianId || entry.technician_id || null,
        technicianName: entry.technicianName || entry.technician_name || null,
        entryType: entryType,
        payload: JSON.stringify(payloadData),
        syncStatus: 'synced',
        submittedAt: entry.timestamp ? new Date(entry.timestamp) : new Date(),
      };
      
      if (entry.id) {
        const existing = await storage.getFieldEntry(entry.id);
        if (existing) {
          await storage.updateFieldEntry(entry.id, mappedEntry);
          return res.json({ success: true, action: 'updated', id: entry.id });
        }
      }
      
      const created = await storage.createFieldEntry(mappedEntry);
      res.json({ success: true, action: 'created', id: created.id });
    } catch (error: any) {
      console.error('Error receiving field entry:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/sync/estimates', async (req: Request, res: Response) => {
    try {
      const estimates = await storage.getEstimates();
      res.json({ estimates });
    } catch (error: any) {
      console.error('Error fetching estimates for sync:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/sync/estimates', async (req: Request, res: Response) => {
    try {
      const { estimate } = req.body;
      if (!estimate) {
        return res.status(400).json({ error: 'estimate required' });
      }
      
      const propertyId = estimate.propertyId || estimate.property_id;
      const propertyName = estimate.propertyName || estimate.property_name;
      
      if (!propertyId || !propertyName) {
        return res.status(400).json({ error: 'propertyId and propertyName are required' });
      }
      
      const mappedEstimate: Record<string, any> = {
        propertyId,
        propertyName,
        title: estimate.title || 'Field Estimate',
        status: estimate.status || 'draft',
      };
      
      if (estimate.customerName || estimate.customer_name) {
        mappedEstimate.customerName = estimate.customerName || estimate.customer_name;
      }
      if (estimate.customerEmail || estimate.customer_email) {
        mappedEstimate.customerEmail = estimate.customerEmail || estimate.customer_email;
      }
      if (estimate.address) {
        mappedEstimate.address = estimate.address;
      }
      
      if (estimate.technicianId || estimate.technician_id || estimate.createdByTechId) {
        mappedEstimate.createdByTechId = estimate.technicianId || estimate.technician_id || estimate.createdByTechId;
      }
      if (estimate.technicianName || estimate.technician_name || estimate.createdByTechName) {
        mappedEstimate.createdByTechName = estimate.technicianName || estimate.technician_name || estimate.createdByTechName;
      }
      
      if (estimate.description) mappedEstimate.description = estimate.description;
      
      const lineItems = estimate.lineItems || estimate.line_items || estimate.items;
      if (lineItems) {
        mappedEstimate.items = Array.isArray(lineItems) ? lineItems : 
          (typeof lineItems === 'string' ? JSON.parse(lineItems) : []);
      }
      
      if (estimate.totalAmount !== undefined || estimate.total_amount !== undefined) {
        mappedEstimate.totalAmount = parseInt(estimate.totalAmount || estimate.total_amount || 0);
      }
      if (estimate.partsTotal !== undefined || estimate.parts_total !== undefined) {
        mappedEstimate.partsTotal = parseInt(estimate.partsTotal || estimate.parts_total || 0);
      }
      if (estimate.laborTotal !== undefined || estimate.labor_total !== undefined) {
        mappedEstimate.laborTotal = parseInt(estimate.laborTotal || estimate.labor_total || 0);
      }
      
      if (mappedEstimate.status === 'pending') {
        mappedEstimate.sentForApprovalAt = new Date();
      }
      
      if (estimate.id) {
        const existing = await storage.getEstimate(estimate.id);
        if (existing) {
          await storage.updateEstimate(estimate.id, mappedEstimate);
          return res.json({ success: true, action: 'updated', id: estimate.id });
        }
      }
      
      const created = await storage.createEstimate(mappedEstimate as any);
      res.json({ success: true, action: 'created', id: created.id });
    } catch (error: any) {
      console.error('Error receiving estimate:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
