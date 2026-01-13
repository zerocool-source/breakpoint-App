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

  app.get('/api/visits', async (req: Request, res: Response) => {
    try {
      const { propertyId, technicianId, technicianName, entryType, startDate, endDate } = req.query;
      const entries = await storage.getFieldEntries({
        propertyId: propertyId as string | undefined,
        technicianId: technicianId as string | undefined,
        technicianName: technicianName as string | undefined,
        entryType: entryType as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      res.json(entries);
    } catch (error: any) {
      console.error('Error fetching visits:', error);
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
      
      console.log('=== SYNC ESTIMATES: Incoming Request ===');
      console.log('Raw request body:', JSON.stringify(req.body, null, 2));
      console.log('Estimate object keys:', estimate ? Object.keys(estimate) : 'null');
      console.log('Description field:', estimate?.description);
      console.log('Photos field:', estimate?.photos);
      console.log('Photo_urls field:', estimate?.photo_urls);
      console.log('=== END SYNC ESTIMATES LOG ===');
      
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
      
      if (estimate.photos || estimate.photo_urls) {
        const rawPhotos = estimate.photos || estimate.photo_urls || [];
        console.log('Raw photos received:', typeof rawPhotos, Array.isArray(rawPhotos) ? `Array(${rawPhotos.length})` : rawPhotos);
        
        const photosArray = Array.isArray(rawPhotos) ? rawPhotos : 
          (typeof rawPhotos === 'string' ? JSON.parse(rawPhotos) : []);
        
        const extractedUrls = photosArray.map((photo: any, idx: number) => {
          console.log(`Photo ${idx} type:`, typeof photo, photo && typeof photo === 'object' ? 'has url:' + !!photo.url : '');
          if (typeof photo === 'string') {
            return photo;
          } else if (photo && typeof photo === 'object' && photo.url) {
            console.log(`Photo ${idx} url extracted, length:`, photo.url.length);
            return photo.url;
          }
          console.log(`Photo ${idx} could not extract URL`);
          return null;
        }).filter((url: any) => url !== null);
        
        console.log('Extracted photo URLs count:', extractedUrls.length);
        mappedEstimate.photos = extractedUrls;
      }
      
      if (estimate.reportedDate || estimate.reported_date) {
        mappedEstimate.reportedDate = new Date(estimate.reportedDate || estimate.reported_date);
      }
      
      if (estimate.serviceTechId || estimate.service_tech_id) {
        mappedEstimate.serviceTechId = estimate.serviceTechId || estimate.service_tech_id;
      }
      if (estimate.serviceTechName || estimate.service_tech_name) {
        mappedEstimate.serviceTechName = estimate.serviceTechName || estimate.service_tech_name;
      }
      
      if (estimate.repairTechId || estimate.repair_tech_id) {
        mappedEstimate.repairTechId = estimate.repairTechId || estimate.repair_tech_id;
      }
      if (estimate.repairTechName || estimate.repair_tech_name) {
        mappedEstimate.repairTechName = estimate.repairTechName || estimate.repair_tech_name;
      }
      
      const dollarsToCents = (value: any): number => {
        const num = Number(value || 0);
        return Math.round(num * 100);
      };
      
      const maybeConvertToCents = (value: any, alreadyCents?: boolean): number => {
        if (alreadyCents) {
          return Math.round(Number(value || 0));
        }
        return dollarsToCents(value);
      };
      
      const valuesInCents = estimate.valuesInCents === true || estimate.values_in_cents === true;
      
      const lineItems = estimate.lineItems || estimate.line_items || estimate.items;
      if (lineItems) {
        const rawItems = Array.isArray(lineItems) ? lineItems : 
          (typeof lineItems === 'string' ? JSON.parse(lineItems) : []);
        
        mappedEstimate.items = rawItems.map((item: any, index: number) => {
          const qty = Number(item.quantity || item.qty || 1);
          const rate = Number(item.rate || item.unitPrice || item.unit_price || 0);
          const amount = Number(item.amount || item.total || 0) || (qty * rate);
          
          return {
            lineNumber: item.lineNumber || item.line_number || index + 1,
            serviceDate: item.serviceDate || item.service_date || null,
            productService: item.productService || item.product_service || item.name || item.description || '',
            description: item.description || item.name || '',
            sku: item.sku || item.SKU || '',
            quantity: qty,
            rate: rate,
            amount: amount,
            taxable: item.taxable !== undefined ? item.taxable : true,
            class: item.class || '',
          };
        });
        
        const subtotalDollars = mappedEstimate.items.reduce((sum: number, item: any) => sum + item.amount, 0);
        mappedEstimate.subtotal = Math.round(subtotalDollars * 100);
      }
      
      if (estimate.totalAmount !== undefined || estimate.total_amount !== undefined) {
        mappedEstimate.totalAmount = maybeConvertToCents(estimate.totalAmount || estimate.total_amount, valuesInCents);
      }
      if (estimate.partsTotal !== undefined || estimate.parts_total !== undefined) {
        mappedEstimate.partsTotal = maybeConvertToCents(estimate.partsTotal || estimate.parts_total, valuesInCents);
      }
      if (estimate.laborTotal !== undefined || estimate.labor_total !== undefined) {
        mappedEstimate.laborTotal = maybeConvertToCents(estimate.laborTotal || estimate.labor_total, valuesInCents);
      }
      
      if (estimate.techNotes || estimate.tech_notes) {
        mappedEstimate.techNotes = estimate.techNotes || estimate.tech_notes;
      }
      if (estimate.customerNote || estimate.customer_note) {
        mappedEstimate.customerNote = estimate.customerNote || estimate.customer_note;
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
