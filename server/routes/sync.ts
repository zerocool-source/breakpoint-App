import { Request, Response } from "express";
import { storage } from "../storage";
import fs from "fs";
import path from "path";
import { db } from "../db";
import {
  customers, properties, technicians, customerAddresses, customerContacts,
  pools, equipment, routes, routeStops, estimates, emergencies, repairRequests,
  customerTags, customerTagAssignments, customerZones
} from "@shared/schema";

export function registerSyncRoutes(app: any) {
  // ==================== DATA BACKUP/RESTORE ====================

  // Export all data for backup/migration
  app.get('/api/data/export', async (req: Request, res: Response) => {
    try {
      console.log('[Data Export] Starting full data export...');

      const exportData: Record<string, any[]> = {
        customers: await storage.getCustomers(),
        properties: await storage.getProperties(),
        technicians: await storage.getTechnicians(),
        routes: await storage.getRoutes(),
        routeStops: await storage.getAllRouteStops(),
        estimates: await storage.getEstimates(),
        emergencies: await storage.getEmergencies(),
        repairRequests: await storage.getRepairRequests(),
        customerTags: await storage.getCustomerTags(),
      };

      // Get addresses, contacts, pools for each customer
      const customerDetails: Record<string, any> = {};
      for (const customer of exportData.customers) {
        customerDetails[customer.id] = {
          addresses: await storage.getCustomerAddresses(customer.id),
          contacts: await storage.getCustomerContacts(customer.id),
          pools: await storage.getPoolsByCustomer(customer.id),
          equipment: await storage.getEquipmentByCustomer(customer.id),
          tags: await storage.getCustomerTagsWithAssignments(customer.id),
        };
      }
      exportData.customerDetails = [customerDetails];

      // Get property contacts
      const propertyDetails: Record<string, any> = {};
      for (const property of exportData.properties) {
        try {
          const contacts = await storage.getPropertyContacts(property.id);
          const accessNotes = await storage.getPropertyAccessNotes(property.id);
          propertyDetails[property.id] = { contacts, accessNotes };
        } catch {
          propertyDetails[property.id] = { contacts: [], accessNotes: [] };
        }
      }
      exportData.propertyDetails = [propertyDetails];

      const counts = Object.entries(exportData).map(([key, val]) =>
        `${key}: ${Array.isArray(val) ? val.length : Object.keys(val).length}`
      ).join(', ');

      console.log(`[Data Export] Complete. ${counts}`);

      res.json({
        success: true,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        data: exportData,
      });
    } catch (error: any) {
      console.error('[Data Export] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Import data from backup
  app.post('/api/data/import', async (req: Request, res: Response) => {
    try {
      const { data, mode = 'merge' } = req.body; // mode: 'merge' or 'replace'

      if (!data) {
        return res.status(400).json({ error: 'No data provided' });
      }

      console.log(`[Data Import] Starting import in ${mode} mode...`);

      const results: Record<string, { created: number; updated: number; errors: number }> = {};

      // Import customer tags first (dependencies)
      if (data.customerTags?.length) {
        results.customerTags = { created: 0, updated: 0, errors: 0 };
        for (const tag of data.customerTags) {
          try {
            const existing = await storage.getCustomerTags();
            const found = existing.find((t: any) => t.id === tag.id || t.name === tag.name);
            if (!found) {
              await storage.createCustomerTag(tag);
              results.customerTags.created++;
            }
          } catch (e) {
            results.customerTags.errors++;
          }
        }
      }

      // Import customers
      if (data.customers?.length) {
        results.customers = { created: 0, updated: 0, errors: 0 };
        for (const customer of data.customers) {
          try {
            const existing = await storage.getCustomer(customer.id);
            if (existing) {
              if (mode === 'replace') {
                await storage.updateCustomer(customer.id, customer);
                results.customers.updated++;
              }
            } else {
              await storage.createCustomer(customer);
              results.customers.created++;
            }
          } catch (e) {
            console.error(`[Import] Customer error:`, e);
            results.customers.errors++;
          }
        }
      }

      // Import customer details (addresses, contacts, pools, equipment)
      if (data.customerDetails?.[0]) {
        const details = data.customerDetails[0];
        results.customerAddresses = { created: 0, updated: 0, errors: 0 };
        results.customerContacts = { created: 0, updated: 0, errors: 0 };
        results.pools = { created: 0, updated: 0, errors: 0 };
        results.equipment = { created: 0, updated: 0, errors: 0 };

        for (const [customerId, customerData] of Object.entries(details) as [string, any][]) {
          // Addresses
          for (const address of customerData.addresses || []) {
            try {
              await storage.createCustomerAddress({ ...address, customerId });
              results.customerAddresses.created++;
            } catch { results.customerAddresses.errors++; }
          }
          // Contacts
          for (const contact of customerData.contacts || []) {
            try {
              await storage.createCustomerContact({ ...contact, customerId });
              results.customerContacts.created++;
            } catch { results.customerContacts.errors++; }
          }
          // Pools
          for (const pool of customerData.pools || []) {
            try {
              await storage.createPool({ ...pool, customerId });
              results.pools.created++;
            } catch { results.pools.errors++; }
          }
          // Equipment
          for (const equip of customerData.equipment || []) {
            try {
              await storage.createEquipment({ ...equip, customerId });
              results.equipment.created++;
            } catch { results.equipment.errors++; }
          }
        }
      }

      // Import properties
      if (data.properties?.length) {
        results.properties = { created: 0, updated: 0, errors: 0 };
        for (const property of data.properties) {
          try {
            const existing = await storage.getProperty(property.id);
            if (existing) {
              if (mode === 'replace') {
                await storage.updateProperty(property.id, property);
                results.properties.updated++;
              }
            } else {
              await storage.createProperty(property);
              results.properties.created++;
            }
          } catch (e) {
            results.properties.errors++;
          }
        }
      }

      // Import technicians
      if (data.technicians?.length) {
        results.technicians = { created: 0, updated: 0, errors: 0 };
        for (const tech of data.technicians) {
          try {
            const existing = await storage.getTechnician(tech.id);
            if (existing) {
              if (mode === 'replace') {
                await storage.updateTechnician(tech.id, tech);
                results.technicians.updated++;
              }
            } else {
              await storage.createTechnician(tech);
              results.technicians.created++;
            }
          } catch (e) {
            results.technicians.errors++;
          }
        }
      }

      // Import routes
      if (data.routes?.length) {
        results.routes = { created: 0, updated: 0, errors: 0 };
        for (const route of data.routes) {
          try {
            const existing = await storage.getRoute(route.id);
            if (!existing) {
              await storage.createRoute(route);
              results.routes.created++;
            }
          } catch (e) {
            results.routes.errors++;
          }
        }
      }

      // Import route stops
      if (data.routeStops?.length) {
        results.routeStops = { created: 0, updated: 0, errors: 0 };
        for (const stop of data.routeStops) {
          try {
            const existing = await storage.getRouteStop(stop.id);
            if (!existing) {
              await storage.createRouteStop(stop);
              results.routeStops.created++;
            }
          } catch (e) {
            results.routeStops.errors++;
          }
        }
      }

      // Import estimates
      if (data.estimates?.length) {
        results.estimates = { created: 0, updated: 0, errors: 0 };
        for (const estimate of data.estimates) {
          try {
            const existing = await storage.getEstimate(estimate.id);
            if (!existing) {
              await storage.createEstimate(estimate);
              results.estimates.created++;
            }
          } catch (e) {
            results.estimates.errors++;
          }
        }
      }

      // Import emergencies
      if (data.emergencies?.length) {
        results.emergencies = { created: 0, updated: 0, errors: 0 };
        for (const emergency of data.emergencies) {
          try {
            const existing = await storage.getEmergency(emergency.id);
            if (!existing) {
              await storage.createEmergency(emergency);
              results.emergencies.created++;
            }
          } catch (e) {
            results.emergencies.errors++;
          }
        }
      }

      console.log('[Data Import] Complete:', JSON.stringify(results, null, 2));

      res.json({
        success: true,
        importedAt: new Date().toISOString(),
        mode,
        results,
      });
    } catch (error: any) {
      console.error('[Data Import] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  // Photo upload endpoint for mobile app
  app.post('/api/sync/upload-photo', async (req: Request, res: Response) => {
    try {
      const { imageData, filename, mimeType } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ error: 'Missing imageData' });
      }
      
      // Extract base64 data (remove data URL prefix if present)
      let base64Data = imageData;
      if (imageData.includes(',')) {
        base64Data = imageData.split(',')[1];
      }
      
      // Generate unique filename
      const ext = mimeType?.includes('png') ? 'png' : 'jpg';
      const generatedFilename = filename || `photo-${Date.now()}-${Math.floor(Math.random() * 1000000000)}.${ext}`;
      
      // Ensure uploads/photos directory exists
      const uploadsDir = path.join(process.cwd(), 'uploads', 'photos');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Save the file
      const filePath = path.join(uploadsDir, generatedFilename);
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      
      // Return the relative URL
      const photoUrl = `/uploads/photos/${generatedFilename}`;
      
      console.log(`Photo uploaded: ${photoUrl}`);
      res.json({ success: true, url: photoUrl });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/sync/properties', async (req: Request, res: Response) => {
    try {
      const properties = await storage.getProperties();
      res.json({ properties });
    } catch (error: any) {
      console.error('Error fetching properties for sync:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/sync/customers', async (req: Request, res: Response) => {
    try {
      const customers = await storage.getCustomers();
      const enrichedCustomers = await Promise.all(
        customers.map(async (customer: any) => {
          const customerTags = await storage.getCustomerTagsWithAssignments(customer.id);
          const warningTags = customerTags.filter((tag: any) => tag.isWarningTag);
          return {
            ...customer,
            warningTags: warningTags.map((tag: any) => ({
              id: tag.id,
              name: tag.name,
              color: tag.color,
            })),
            budget: {
              chemicals: customer.chemicalsBudget ? {
                amount: customer.chemicalsBudget,
                period: customer.chemicalsBudgetPeriod || 'monthly',
              } : null,
              repairs: customer.repairsBudget ? {
                amount: customer.repairsBudget,
                period: customer.repairsBudgetPeriod || 'monthly',
              } : null,
            },
          };
        })
      );
      res.json({ customers: enrichedCustomers });
    } catch (error: any) {
      console.error('Error fetching customers for sync:', error);
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
