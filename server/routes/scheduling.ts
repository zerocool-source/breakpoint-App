import { Request, Response } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { routeStops, routes, Route, RouteStop } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerSchedulingRoutes(app: any) {
  // Route Schedule endpoints
  app.get("/api/properties/:propertyId/route-schedule", async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const schedule = await storage.getRouteScheduleByProperty(propertyId);
      res.json({ schedule: schedule || null });
    } catch (error: any) {
      console.error("Error fetching route schedule:", error);
      res.status(500).json({ error: "Failed to fetch route schedule" });
    }
  });

  // Get upcoming scheduled visits for a property with route/technician info
  app.get("/api/properties/:propertyId/upcoming-visits", async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const occurrences = await storage.getServiceOccurrencesByProperty(propertyId);
      
      // Get all routes to look up route names/technicians
      const allRoutes = await storage.getRoutes();
      const routeMap = new Map<string, { name: string; technicianName: string | null; color: string }>();
      for (const route of allRoutes) {
        routeMap.set(route.id, { 
          name: route.name, 
          technicianName: route.technicianName, 
          color: route.color 
        });
      }
      
      // Filter to recent and upcoming visits (within 2 weeks before and 4 weeks ahead)
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const fourWeeksAhead = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
      
      const filteredOccurrences = occurrences.filter(occ => {
        const occDate = new Date(occ.date);
        return occDate >= twoWeeksAgo && occDate <= fourWeeksAhead;
      });
      
      // Enrich occurrences with route info and sort by date
      const enrichedVisits = filteredOccurrences
        .map(occ => {
          const routeInfo = occ.routeId ? routeMap.get(occ.routeId) : null;
          return {
            id: occ.id,
            date: occ.date,
            status: occ.status,
            routeId: occ.routeId,
            routeName: routeInfo?.name || null,
            technicianName: routeInfo?.technicianName || null,
            routeColor: routeInfo?.color || null,
          };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      res.json({ visits: enrichedVisits });
    } catch (error: any) {
      console.error("Error fetching upcoming visits:", error);
      res.status(500).json({ error: "Failed to fetch upcoming visits" });
    }
  });

  app.put("/api/properties/:propertyId/route-schedule", async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const scheduleData = req.body;
      const schedule = await storage.upsertRouteSchedule(propertyId, scheduleData);
      
      // Delete existing unscheduled service occurrences for this schedule
      await storage.deleteServiceOccurrencesBySchedule(schedule.id);
      
      // Determine active visit days based on activeSeason
      const activeSeason = schedule.activeSeason || "summer";
      const activeVisitDays = activeSeason === "summer" 
        ? (schedule.summerVisitDays || schedule.visitDays || [])
        : (schedule.winterVisitDays || []);
      
      // If schedule is active and has visit days, generate service occurrences
      if (schedule.isActive && activeVisitDays && activeVisitDays.length > 0) {
        // Get property info for customer name
        const property = await storage.getCustomerAddress(propertyId);
        let customerName = "";
        if (property && property.customerId) {
          const customer = await storage.getCustomer(property.customerId);
          customerName = customer?.name || "";
        }
        
        // Map day names to day of week numbers (0-6, Mon-Sun format used in scheduling)
        // Keys are lowercase to match frontend values
        const dayNameToNumber: Record<string, number> = {
          "monday": 0,
          "tuesday": 1,
          "wednesday": 2,
          "thursday": 3,
          "friday": 4,
          "saturday": 5,
          "sunday": 6
        };
        
        // Generate service occurrences for each visit day
        // Calculate the Monday of the current scheduling week
        const today = new Date();
        const currentJsDayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, etc.
        // Calculate days since Monday (if Sunday, it's 6 days since Monday)
        const daysSinceMonday = currentJsDayOfWeek === 0 ? 6 : currentJsDayOfWeek - 1;
        const weekStartMonday = new Date(today);
        weekStartMonday.setDate(today.getDate() - daysSinceMonday);
        weekStartMonday.setHours(0, 0, 0, 0);
        
        const occurrencesToCreate = activeVisitDays.map((dayName: string) => {
          const targetDay = dayNameToNumber[dayName] ?? 0; // 0=Monday, 1=Tuesday, etc.
          // Calculate the date for this day within the current week
          const occurrenceDate = new Date(weekStartMonday);
          occurrenceDate.setDate(weekStartMonday.getDate() + targetDay);
          occurrenceDate.setHours(8, 0, 0, 0); // Set to 8 AM
          
          return {
            sourceScheduleId: schedule.id,
            propertyId: propertyId,
            date: occurrenceDate,
            status: "unscheduled",
            routeId: null,
            technicianId: null,
            isAutoGenerated: true
          };
        });
        
        if (occurrencesToCreate.length > 0) {
          await storage.bulkCreateServiceOccurrences(occurrencesToCreate);
        }
      }
      
      res.json({ schedule });
    } catch (error: any) {
      console.error("Error saving route schedule:", error);
      res.status(500).json({ error: "Failed to save route schedule" });
    }
  });

  // Service occurrence endpoints
  app.get("/api/properties/:propertyId/service-occurrences", async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const occurrences = await storage.getServiceOccurrencesByProperty(propertyId);
      res.json({ occurrences });
    } catch (error: any) {
      console.error("Error fetching service occurrences:", error);
      res.status(500).json({ error: "Failed to fetch service occurrences" });
    }
  });

  // ==================== ROUTES (Scheduling) ====================

  // Assign occurrence to route
  app.post("/api/occurrences/:id/assign", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { routeId, technicianId } = req.body;
      
      if (!routeId) {
        return res.status(400).json({ error: "routeId is required" });
      }
      
      // Verify occurrence exists
      const occurrence = await storage.getServiceOccurrence(id);
      if (!occurrence) {
        return res.status(404).json({ error: "Occurrence not found" });
      }
      
      // Verify route exists
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ error: "Route not found" });
      }
      
      // Assign the occurrence to the route
      const updated = await storage.assignOccurrenceToRoute(id, routeId, technicianId || route.technicianId);
      
      res.json({ occurrence: updated });
    } catch (error: any) {
      console.error("Error assigning occurrence to route:", error);
      res.status(500).json({ error: "Failed to assign occurrence to route" });
    }
  });

  // Unassign occurrence from route (return to unscheduled)
  app.post("/api/occurrences/:id/unassign", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Verify occurrence exists
      const occurrence = await storage.getServiceOccurrence(id);
      if (!occurrence) {
        return res.status(404).json({ error: "Occurrence not found" });
      }
      
      // Unassign the occurrence from the route
      const updated = await storage.unassignOccurrenceFromRoute(id);
      
      res.json({ occurrence: updated });
    } catch (error: any) {
      console.error("Error unassigning occurrence from route:", error);
      res.status(500).json({ error: "Failed to unassign occurrence from route" });
    }
  });

  // Get unscheduled service occurrences by date range
  app.get("/api/unscheduled", async (req: Request, res: Response) => {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        return res.status(400).json({ error: "start and end date parameters are required (YYYY-MM-DD)" });
      }
      
      const startDate = new Date(start + "T00:00:00.000Z");
      const endDate = new Date(end + "T23:59:59.999Z");
      
      // Auto-generate occurrences from active route schedules
      const activeSchedules = await storage.getActiveRouteSchedules();
      const dayNameToIndex: { [key: string]: number } = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
      };
      
      // Get all addresses with customer data in one efficient query
      const allAddresses = await storage.getAllAddressesWithCustomers();
      const addressMap = new Map<string, { propertyName: string; customerName: string; address: string }>();
      
      for (const addr of allAddresses) {
        addressMap.set(addr.id, {
          propertyName: addr.addressLine1 || "Property",
          customerName: addr.customerName,
          address: `${addr.addressLine1 || ""}, ${addr.city || ""}, ${addr.state || ""} ${addr.zip || ""}`.trim()
        });
      }
      
      // Generate occurrences for each active schedule
      for (const schedule of activeSchedules) {
        // Determine active visit days based on activeSeason
        const activeSeason = schedule.activeSeason || "summer";
        const activeVisitDays = activeSeason === "summer" 
          ? (schedule.summerVisitDays || schedule.visitDays || [])
          : (schedule.winterVisitDays || []);
        
        if (!activeVisitDays || activeVisitDays.length === 0) continue;
        
        const existingOccurrences = await storage.getServiceOccurrencesByProperty(schedule.propertyId);
        const existingDates = new Set(existingOccurrences.map(o => o.date.toISOString().split("T")[0]));
        
        // Iterate through each day in the date range
        const current = new Date(startDate);
        const occurrencesToCreate: any[] = [];
        
        while (current <= endDate) {
          const dayIndex = current.getDay();
          const dayName = Object.keys(dayNameToIndex).find(k => dayNameToIndex[k] === dayIndex);
          
          if (dayName && activeVisitDays.includes(dayName)) {
            const dateStr = current.toISOString().split("T")[0];
            if (!existingDates.has(dateStr)) {
              occurrencesToCreate.push({
                propertyId: schedule.propertyId,
                date: new Date(dateStr + "T00:00:00.000Z"),
                status: "unscheduled",
                sourceScheduleId: schedule.id,
              });
              existingDates.add(dateStr);
            }
          }
          current.setDate(current.getDate() + 1);
        }
        
        if (occurrencesToCreate.length > 0) {
          await storage.bulkCreateServiceOccurrences(occurrencesToCreate);
        }
      }
      
      // Now get all unscheduled occurrences
      const occurrences = await storage.getUnscheduledOccurrences(startDate, endDate);
      
      // Enrich with property/customer data
      const enrichedOccurrences = occurrences.map((occ) => {
        const addrInfo = addressMap.get(occ.propertyId);
        return {
          ...occ,
          propertyName: addrInfo?.propertyName || occ.propertyId,
          customerName: addrInfo?.customerName || "",
          address: addrInfo?.address || "",
        };
      });
      
      res.json({ occurrences: enrichedOccurrences });
    } catch (error: any) {
      console.error("Error getting unscheduled occurrences:", error);
      res.status(500).json({ error: "Failed to get unscheduled occurrences" });
    }
  });

  // Get routes by date range
  app.get("/api/routes/by-date", async (req: Request, res: Response) => {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        return res.status(400).json({ error: "start and end date parameters are required (YYYY-MM-DD)" });
      }
      
      const startDate = new Date(start + "T00:00:00.000Z");
      const endDate = new Date(end + "T23:59:59.999Z");
      
      const routesList = await storage.getRoutesByDateRange(startDate, endDate);
      
      // Fetch stops for each route
      const routesWithStops = await Promise.all(
        routesList.map(async (route) => {
          const stops = await storage.getRouteStops(route.id);
          return { ...route, stops };
        })
      );
      
      res.json({ routes: routesWithStops });
    } catch (error: any) {
      console.error("Error getting routes by date:", error);
      res.status(500).json({ error: "Failed to get routes by date" });
    }
  });

  // Get all routes (optionally filter by day of week)
  app.get("/api/routes", async (req: Request, res: Response) => {
    try {
      const dayOfWeek = req.query.dayOfWeek !== undefined ? parseInt(req.query.dayOfWeek as string) : undefined;
      const routesList = await storage.getRoutes(dayOfWeek);
      
      // Fetch stops for each route (including assigned occurrences)
      const routesWithStops = await Promise.all(
        routesList.map(async (route) => {
          const [manualStops, assignedOccurrences] = await Promise.all([
            storage.getRouteStops(route.id),
            storage.getRouteAssignedOccurrences(route.id)
          ]);
          
          // Transform assigned occurrences to match stop format
          const occurrenceStops = assignedOccurrences.map((occ, index) => ({
            id: occ.id,
            routeId: route.id,
            propertyId: occ.propertyId,
            propertyName: occ.addressLine1 || "Property",
            customerId: null,
            customerName: occ.customerName,
            address: `${occ.addressLine1 || ""}, ${occ.city || ""} ${occ.state || ""} ${occ.zip || ""}`.trim(),
            city: occ.city,
            state: occ.state,
            zip: occ.zip,
            sortOrder: manualStops.length + index + 1,
            estimatedTime: 30,
            status: occ.status,
            date: occ.date,
            isOccurrence: true, // Flag to distinguish from manual stops
          }));
          
          // Combine manual stops and assigned occurrences
          const allStops = [...manualStops, ...occurrenceStops];
          return { ...route, stops: allStops };
        })
      );
      
      res.json({ routes: routesWithStops });
    } catch (error: any) {
      console.error("Error getting routes:", error);
      res.status(500).json({ error: "Failed to get routes" });
    }
  });

  // Get single route with stops
  app.get("/api/routes/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const route = await storage.getRoute(id);
      if (!route) {
        return res.status(404).json({ error: "Route not found" });
      }
      const stops = await storage.getRouteStops(id);
      res.json({ route: { ...route, stops } });
    } catch (error: any) {
      console.error("Error getting route:", error);
      res.status(500).json({ error: "Failed to get route" });
    }
  });

  // Create new route
  app.post("/api/routes", async (req: Request, res: Response) => {
    try {
      const { customerIds, date, ...routeData } = req.body;
      
      // Convert date string to Date object if provided
      const routeToCreate = {
        ...routeData,
        date: date ? new Date(date + "T00:00:00.000Z") : null,
      };
      
      const route = await storage.createRoute(routeToCreate);
      
      // If customers were selected, create stops for each
      if (customerIds && Array.isArray(customerIds) && customerIds.length > 0) {
        for (let i = 0; i < customerIds.length; i++) {
          const customerId = customerIds[i];
          const customer = await storage.getCustomer(customerId);
          if (customer) {
            // Get first property for the customer if any
            const properties = await storage.getCustomerAddresses(customerId);
            const property = properties[0];
            
            await storage.createRouteStop({
              routeId: route.id,
              propertyId: property?.id || customerId,
              propertyName: property?.addressLine1 || customer.name,
              customerId: customer.externalId || customer.id,
              customerName: customer.name,
              address: property ? `${property.addressLine1 || ""}, ${property.city || ""} ${property.state || ""} ${property.zip || ""}`.trim() : customer.address || "",
              city: property?.city || "",
              state: property?.state || "",
              zip: property?.zip || "",
              sortOrder: i + 1,
              estimatedTime: 30,
            });
          }
        }
      }
      
      res.json({ route });
    } catch (error: any) {
      console.error("Error creating route:", error);
      res.status(500).json({ error: "Failed to create route" });
    }
  });

  // Update route
  app.put("/api/routes/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { date, ...updates } = req.body;
      
      // Convert date string to Date object if provided
      const routeUpdates = {
        ...updates,
        ...(date !== undefined ? { date: date ? new Date(date + "T00:00:00.000Z") : null } : {}),
      };
      
      const route = await storage.updateRoute(id, routeUpdates);
      if (!route) {
        return res.status(404).json({ error: "Route not found" });
      }
      res.json({ route });
    } catch (error: any) {
      console.error("Error updating route:", error);
      res.status(500).json({ error: "Failed to update route" });
    }
  });

  // Delete route
  app.delete("/api/routes/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteRoute(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting route:", error);
      res.status(500).json({ error: "Failed to delete route" });
    }
  });

  // Reorder routes
  app.put("/api/routes/reorder", async (req: Request, res: Response) => {
    try {
      const { routeIds } = req.body;
      await storage.reorderRoutes(routeIds);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error reordering routes:", error);
      res.status(500).json({ error: "Failed to reorder routes" });
    }
  });

  // ==================== ROUTE STOPS ====================

  // Get stops for a route
  app.get("/api/routes/:routeId/stops", async (req: Request, res: Response) => {
    try {
      const { routeId } = req.params;
      const stops = await storage.getRouteStops(routeId);
      res.json({ stops });
    } catch (error: any) {
      console.error("Error getting route stops:", error);
      res.status(500).json({ error: "Failed to get route stops" });
    }
  });

  // Create route stop
  app.post("/api/routes/:routeId/stops", async (req: Request, res: Response) => {
    try {
      const { routeId } = req.params;
      const stop = await storage.createRouteStop({ ...req.body, routeId });
      res.json({ stop });
    } catch (error: any) {
      console.error("Error creating route stop:", error);
      res.status(500).json({ error: "Failed to create route stop" });
    }
  });

  // Create a single route stop (with auto-route creation if needed)
  app.post("/api/route-stops", async (req: Request, res: Response) => {
    try {
      const { routeId, propertyId, propertyName, customerId, customerName, poolId, 
              address, city, state, zip, poolName, notes, sortOrder, estimatedTime, frequency,
              technicianId, technicianName, dayOfWeek, waterBodyType, scheduledDate, isCoverage } = req.body;
      
      if (!propertyId) {
        return res.status(400).json({ error: "propertyId is required" });
      }
      
      let actualRouteId = routeId;
      
      // If no routeId provided but technicianId is, find or create a route for the technician
      if (!actualRouteId && technicianId) {
        // Default to Monday (1) if not specified
        const targetDayOfWeek = dayOfWeek !== undefined ? dayOfWeek : 1;
        
        // Try to find an existing route for this technician for the target day
        const existingRoutes = await db
          .select()
          .from(routes)
          .where(eq(routes.technicianId, technicianId));
        
        // First try to find a route matching the target day
        let targetRoute = existingRoutes.find((r: Route) => r.dayOfWeek === targetDayOfWeek);
        
        // If no route for target day, use any existing route
        if (!targetRoute && existingRoutes.length > 0) {
          targetRoute = existingRoutes[0];
        }
        
        if (targetRoute) {
          actualRouteId = targetRoute.id;
        } else {
          // Create a new route for the technician
          const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const [newRoute] = await db
            .insert(routes)
            .values({
              name: `${technicianName || "Technician"}'s ${dayNames[targetDayOfWeek]} Route`,
              dayOfWeek: targetDayOfWeek,
              technicianId,
              technicianName,
              color: "#0891b2",
            })
            .returning();
          actualRouteId = newRoute.id;
        }
      }
      
      if (!actualRouteId) {
        return res.status(400).json({ error: "Either routeId or technicianId is required" });
      }
      
      const [stop] = await db
        .insert(routeStops)
        .values({
          routeId: actualRouteId,
          propertyId,
          propertyName: propertyName || "Unknown Property",
          customerId,
          customerName: customerName || undefined,
          poolId,
          address: address || undefined,
          city,
          state,
          zip,
          poolName,
          waterBodyType: waterBodyType || "Pool",
          scheduledDate: scheduledDate || undefined,
          isCoverage: isCoverage || false,
          notes: notes || undefined,
          sortOrder: sortOrder ?? 0,
          estimatedTime: estimatedTime ?? 30,
          frequency: frequency || "weekly",
        })
        .returning();
      
      res.json({ stop, routeId: actualRouteId });
    } catch (error: any) {
      console.error("Error creating route stop:", error);
      res.status(500).json({ error: "Failed to create route stop" });
    }
  });

  // Update route stop
  app.put("/api/route-stops/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const stop = await storage.updateRouteStop(id, req.body);
      if (!stop) {
        return res.status(404).json({ error: "Route stop not found" });
      }
      res.json({ stop });
    } catch (error: any) {
      console.error("Error updating route stop:", error);
      res.status(500).json({ error: "Failed to update route stop" });
    }
  });

  // Delete route stop
  app.delete("/api/route-stops/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteRouteStop(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting route stop:", error);
      res.status(500).json({ error: "Failed to delete route stop" });
    }
  });

  // Get stops for a specific technician
  app.get("/api/technician-stops/:technicianId", async (req: Request, res: Response) => {
    try {
      const { technicianId } = req.params;
      
      // Find routes belonging to this technician
      const techRoutes = await db
        .select()
        .from(routes)
        .where(eq(routes.technicianId, technicianId));
      
      if (techRoutes.length === 0) {
        return res.json([]);
      }
      
      // Get route IDs
      const routeIds = techRoutes.map((r: Route) => r.id);
      
      // Get all stops for these routes
      const allStops: RouteStop[] = await db
        .select()
        .from(routeStops);
      
      // Filter stops that belong to the technician's routes
      const techStops = allStops.filter((stop: RouteStop) => routeIds.includes(stop.routeId));
      
      // Sort by scheduled date (most recent first)
      techStops.sort((a: RouteStop, b: RouteStop) => {
        if (!a.scheduledDate && !b.scheduledDate) return 0;
        if (!a.scheduledDate) return 1;
        if (!b.scheduledDate) return -1;
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      });
      
      res.json(techStops);
    } catch (error: any) {
      console.error("Error fetching technician stops:", error);
      res.status(500).json({ error: "Failed to fetch technician stops" });
    }
  });

  // Move stop to different route
  app.post("/api/route-stops/:id/move", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { newRouteId, isPermanent, moveDate } = req.body;
      const stop = await storage.moveStopToRoute(id, newRouteId, isPermanent, moveDate ? new Date(moveDate) : undefined);
      if (!stop) {
        return res.status(404).json({ error: "Route stop not found" });
      }
      res.json({ stop });
    } catch (error: any) {
      console.error("Error moving route stop:", error);
      res.status(500).json({ error: "Failed to move route stop" });
    }
  });

  // Reorder stops within a route
  app.put("/api/routes/:routeId/stops/reorder", async (req: Request, res: Response) => {
    try {
      const { stopIds } = req.body;
      await storage.reorderRouteStops(stopIds);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error reordering route stops:", error);
      res.status(500).json({ error: "Failed to reorder route stops" });
    }
  });

  // Reset all scheduling data (routes, stops, moves, unscheduled)
  app.post("/api/scheduling/reset", async (req: Request, res: Response) => {
    try {
      const result = await storage.resetSchedulingData();
      res.json({ 
        success: true, 
        message: "Scheduling data reset successfully",
        ...result
      });
    } catch (error: any) {
      console.error("Error resetting scheduling data:", error);
      res.status(500).json({ error: "Failed to reset scheduling data" });
    }
  });

  // ==================== UNSCHEDULED STOPS ====================

  // Get unscheduled stops
  app.get("/api/unscheduled-stops", async (req: Request, res: Response) => {
    try {
      const stops = await storage.getUnscheduledStops();
      res.json({ stops });
    } catch (error: any) {
      console.error("Error getting unscheduled stops:", error);
      res.status(500).json({ error: "Failed to get unscheduled stops" });
    }
  });

  // Create unscheduled stop
  app.post("/api/unscheduled-stops", async (req: Request, res: Response) => {
    try {
      const stop = await storage.createUnscheduledStop(req.body);
      res.json({ stop });
    } catch (error: any) {
      console.error("Error creating unscheduled stop:", error);
      res.status(500).json({ error: "Failed to create unscheduled stop" });
    }
  });

  // Delete unscheduled stop
  app.delete("/api/unscheduled-stops/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteUnscheduledStop(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting unscheduled stop:", error);
      res.status(500).json({ error: "Failed to delete unscheduled stop" });
    }
  });

  // Move unscheduled stop to route
  app.post("/api/unscheduled-stops/:id/assign", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { routeId } = req.body;
      const stop = await storage.moveUnscheduledToRoute(id, routeId);
      res.json({ stop });
    } catch (error: any) {
      console.error("Error assigning unscheduled stop:", error);
      res.status(500).json({ error: "Failed to assign unscheduled stop" });
    }
  });

  // ==================== POOL BRAIN ROUTE IMPORT (DISABLED) ====================

  // Pool Brain API disabled - returns empty data
  app.get("/api/poolbrain/technician-routes", async (_req: Request, res: Response) => {
    res.json({
      routes: { data: [] },
      technicians: { data: [] },
      pools: { data: [] },
      customers: { data: [] },
      message: "Pool Brain API disabled - use internal data"
    });
  });

  // Pool Brain route import disabled
  app.post("/api/routes/import-from-poolbrain", async (_req: Request, res: Response) => {
    res.json({
      success: false,
      message: "Pool Brain API disabled - route import not available. Create routes manually.",
      createdRoutes: 0,
      createdStops: 0,
    });
  });
}
