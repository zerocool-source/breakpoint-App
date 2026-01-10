import type { Request, Response } from "express";
import { storage } from "../storage";
import { PoolBrainClient } from "../poolbrain-client";
import { parseOfficeNotesForRepairs, extractPricesFromNotes } from "../repair-parser";

export function registerJobRoutes(app: any) {
  // ==================== JOBS ====================
  
  // Debug: Get job audit history to find office notes
  app.get("/api/jobs/debug/:jobId", async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      // Try job audit history which may have more detail
      const auditData = await client.getJobAuditHistory(jobId);
      console.log('Job audit history:', JSON.stringify(auditData, null, 2).substring(0, 5000));
      
      // Also try getting the single job detail
      const jobData = await client.getOneTimeJobDetail(jobId);
      console.log('Single job detail:', JSON.stringify(jobData, null, 2).substring(0, 5000));
      
      res.json({ audit: auditData, detail: jobData });
    } catch (error: any) {
      console.error("Error fetching job debug info:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get jobs with scheduling information - grouped by account and technician
  app.get("/api/jobs", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      // Get date range - last 90 days to next 30 days for more data
      const today = new Date();
      const fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 90);
      const toDate = new Date(today);
      toDate.setDate(toDate.getDate() + 30);

      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      // Fetch ALL technicians with pagination
      const fetchAllTechnicians = async () => {
        const allTechs: any[] = [];
        let offset = 0;
        let hasMore = true;
        const limit = 500;

        while (hasMore) {
          try {
            const techData = await client.getTechnicianDetail({ offset, limit });
            if (techData.data && Array.isArray(techData.data)) {
              allTechs.push(...techData.data);
            }
            hasMore = techData.hasMore === true;
            offset += limit;
          } catch (e) {
            console.error("Error fetching technicians at offset", offset, e);
            break;
          }
        }
        return { data: allTechs };
      };

      // Fetch basic job list (has CustomerID, TechnicianID)
      const fetchAllBasicJobs = async () => {
        const allJobs: any[] = [];
        let offset = 0;
        let hasMore = true;
        const limit = 500;

        while (hasMore) {
          try {
            const jobData = await client.getOneTimeJobList({ 
              fromDate: formatDate(fromDate), 
              toDate: formatDate(toDate), 
              offset, 
              limit 
            });
            if (jobData.data && Array.isArray(jobData.data)) {
              allJobs.push(...jobData.data);
            }
            hasMore = jobData.hasMore === true;
            offset += limit;
          } catch (e) {
            console.error("Error fetching basic jobs at offset", offset, e);
            break;
          }
        }
        console.log(`Fetched ${allJobs.length} basic jobs`);
        return { data: allJobs };
      };

      // Fetch job details (has pricing info)
      const fetchAllJobDetails = async () => {
        const allJobs: any[] = [];
        let offset = 0;
        let hasMore = true;
        const limit = 500;

        while (hasMore) {
          try {
            const jobData = await client.getOneTimeJobListDetails({ 
              fromDate: formatDate(fromDate), 
              toDate: formatDate(toDate), 
              offset, 
              limit 
            });
            if (jobData.data && Array.isArray(jobData.data)) {
              allJobs.push(...jobData.data);
            }
            hasMore = jobData.hasMore === true;
            offset += limit;
          } catch (e) {
            console.error("Error fetching job details at offset", offset, e);
            break;
          }
        }
        console.log(`Fetched ${allJobs.length} job details`);
        return { data: allJobs };
      };

      // Fetch ALL customers with pagination
      const fetchAllCustomers = async () => {
        const allCustomers: any[] = [];
        let offset = 0;
        let hasMore = true;
        const limit = 500;

        while (hasMore) {
          try {
            const custData = await client.getCustomerDetail({ offset, limit });
            if (custData.data && Array.isArray(custData.data)) {
              allCustomers.push(...custData.data);
            }
            hasMore = custData.hasMore === true;
            offset += limit;
          } catch (e) {
            console.error("Error fetching customers at offset", offset, e);
            break;
          }
        }
        console.log(`Fetched ${allCustomers.length} customers`);
        return { data: allCustomers };
      };

      // Fetch all data in parallel
      const [basicJobsData, jobDetailsData, techniciansData, customersData] = await Promise.all([
        fetchAllBasicJobs(),
        fetchAllJobDetails(),
        fetchAllTechnicians(),
        fetchAllCustomers(),
      ]);

      // Build job details map by JobID for price lookup
      const jobDetailsMap: Record<string, any> = {};
      if (jobDetailsData.data && Array.isArray(jobDetailsData.data)) {
        jobDetailsData.data.forEach((detail: any) => {
          const jobId = detail.JobID || detail.RecordID;
          if (jobId) {
            jobDetailsMap[jobId] = detail;
          }
        });
      }

      // Build technician map
      const technicianMap: Record<string, any> = {};
      if (techniciansData.data && Array.isArray(techniciansData.data)) {
        techniciansData.data.forEach((tech: any) => {
          const techId = tech.RecordID;
          if (techId) {
            technicianMap[techId] = tech;
          }
        });
      }

      // Build customer map
      const customerMap: Record<string, any> = {};
      if (customersData.data && Array.isArray(customersData.data)) {
        customersData.data.forEach((c: any) => {
          const customerId = c.RecordID;
          if (customerId) {
            customerMap[customerId] = c;
          }
        });
      }

      // Process basic jobs and merge with details for pricing
      const jobs: any[] = [];
      
      if (basicJobsData.data && Array.isArray(basicJobsData.data)) {
        basicJobsData.data.forEach((job: any) => {
          const jobId = job.JobID || job.RecordID || job.id;
          const techId = job.TechnicianID || job.technicianId || job.TechnicianId;
          const technician = techId ? technicianMap[techId] : undefined;
          const customerId = job.CustomerId || job.CustomerID || job.customerId;
          const customer = customerId ? customerMap[customerId] : undefined;

          // Get detailed job info for pricing
          const jobDetail = jobDetailsMap[jobId] || {};

          // Calculate total price from OneOfJobItemDetails in details
          let totalPrice = 0;
          const items: any[] = [];
          
          const itemDetails = jobDetail.OneOfJobItemDetails || job.OneOfJobItemDetails || [];
          if (Array.isArray(itemDetails)) {
            itemDetails.forEach((item: any) => {
              const qty = item.Qty || item.qty || 1;
              const unitPrice = item.UnitCost || item.unitCost || item.Price || item.price || 0;
              const taxable = item.Taxable || item.taxable || 0;
              totalPrice += qty * unitPrice;
              items.push({
                productId: item.ProductID || item.productId,
                productName: item.ProductName || item.productName || item.Name || item.name || item.Description || item.description || item.ItemName || item.itemName || `Product ${item.ProductID || item.productId || 'N/A'}`,
                qty: qty,
                unitCost: unitPrice,
                taxable: taxable
              });
            });
          }

          // Also check for Price/TotalAmount field directly
          if (totalPrice === 0) {
            totalPrice = job.TotalAmount || job.Price || job.TotalPrice || job.Amount || jobDetail.Price || jobDetail.TotalPrice || 0;
          }

          // Get address - prefer ServiceAddress from job, then customer address
          let address = job.ServiceAddress || "";
          if (!address && customer?.Addresses && typeof customer.Addresses === 'object') {
            const firstAddr = Object.values(customer.Addresses)[0] as any;
            if (firstAddr) {
              const addrLine = firstAddr.PrimaryAddress || firstAddr.BillingAddress || '';
              const city = firstAddr.PrimaryCity || firstAddr.BillingCity || '';
              const state = firstAddr.PrimaryState || firstAddr.BillingState || '';
              const zip = firstAddr.PrimaryZip || firstAddr.BillingZip || '';
              address = `${addrLine}, ${city}, ${state} ${zip}`.trim();
            }
          }

          const techName = technician?.Name || (technician?.FirstName ? `${technician?.FirstName || ''} ${technician?.LastName || ''}`.trim() : "Unassigned");
          const customerName = customer?.CustomerName || customer?.CompanyName || job.CustomerName || "Unknown Customer";

          // Determine completion status - JobStatus field is primary
          const status = job.JobStatus || job.Status || jobDetail.Status || "Pending";
          const isCompleted = status === "Completed" || status === "Complete" || status === "Invoiced" || job.Completed === true || jobDetail.Completed === true;

          jobs.push({
            jobId: jobId,
            title: job.Title || job.JobTitle || jobDetail.Title || "Service Job",
            description: job.Description || jobDetail.Description || "",
            status: status,
            isCompleted: isCompleted,
            scheduledDate: job.JobDate || job.ScheduledDate || job.ServiceDate || jobDetail.ScheduledDate || job.CreatedDate || null,
            scheduledTime: job.ScheduledTime || jobDetail.ScheduledTime || null,
            createdDate: job.CreatedDate || jobDetail.CreatedDate || null,
            lastModifiedDate: job.LastModifiedDate || jobDetail.LastModifiedDate || null,
            technicianId: techId,
            technicianName: techName,
            customerId: customerId,
            customerName: customerName,
            poolName: job.BodyOfWater || job.poolName || jobDetail.BodyOfWater || "",
            address: address,
            price: totalPrice,
            items: items,
            chemicalReadings: jobDetail.chemicalReadings || null,
            officeNotes: jobDetail.OfficeNotes || jobDetail.officeNotes || job.OfficeNotes || job.officeNotes || "",
            instructions: jobDetail.Instructions || jobDetail.instructions || job.Instructions || job.instructions || "",
            raw: { ...job, details: jobDetail }
          });
        });
      }

      console.log(`Processed ${jobs.length} jobs, ${jobs.filter(j => j.customerName !== 'Unknown Customer').length} with customer names`);
      
      // Fetch audit history for ALL SR jobs to get Instructions and Office Notes
      // Match various SR patterns: "SR", 'SR', SR at start, SR anywhere
      const srJobs = jobs.filter(j => {
        const title = j.title?.toLowerCase() || '';
        return title.includes('"sr"') || 
               title.includes("'sr'") || 
               title.startsWith('sr ') || 
               title.startsWith('sr-') ||
               title.includes(' sr ') ||
               title.includes(' sr-') ||
               /\bsr\b/.test(title);
      });
      // Note: Fetching audit history adds ~10 seconds but provides Instructions and Office Notes
      
      // Fetch audit history in parallel batches (limit concurrency)
      const BATCH_SIZE = 10;
      const notesMap: Record<string, { instructions: string; officeNotes: string }> = {};
      
      for (let i = 0; i < srJobs.length; i += BATCH_SIZE) {
        const batch = srJobs.slice(i, i + BATCH_SIZE);
        const auditPromises = batch.map(async (job) => {
          try {
            const auditData = await client.getJobAuditHistory(job.jobId);
            if (auditData.data && Array.isArray(auditData.data)) {
              // Find the most recent Instructions and Office Notes entries
              let instructions = '';
              let officeNotes = '';
              
              // Sort by date descending to get most recent values
              const sorted = auditData.data.sort((a: any, b: any) => 
                new Date(b.lastModifiedDate).getTime() - new Date(a.lastModifiedDate).getTime()
              );
              
              for (const entry of sorted) {
                if (entry.field === 'Changed Instructions' && !instructions) {
                  instructions = entry.newValue || '';
                }
                if (entry.field === 'Changed Office Notes' && !officeNotes) {
                  officeNotes = entry.newValue || '';
                }
                if (instructions && officeNotes) break;
              }
              
              notesMap[job.jobId] = { instructions, officeNotes };
            }
          } catch (e) {
            // Silently ignore audit fetch errors for individual jobs
          }
        });
        await Promise.all(auditPromises);
      }
      
      // Update jobs with notes from audit history
      jobs.forEach(job => {
        const notes = notesMap[job.jobId];
        if (notes) {
          if (notes.instructions && !job.instructions) {
            job.instructions = notes.instructions;
          }
          if (notes.officeNotes && !job.officeNotes) {
            job.officeNotes = notes.officeNotes;
          }
        }
      });

      // Group jobs by ACCOUNT (customer)
      const accountsMap: Record<string, { 
        accountId: string; 
        accountName: string; 
        address: string;
        totalJobs: number;
        completedJobs: number;
        totalValue: number;
        jobs: any[] 
      }> = {};

      // Group jobs by TECHNICIAN
      const technicianJobsMap: Record<string, { 
        techId: string; 
        name: string; 
        phone: string;
        email: string;
        totalJobs: number;
        completedJobs: number;
        totalValue: number;
        jobs: any[] 
      }> = {};

      // Initialize all technicians in the map
      if (techniciansData.data && Array.isArray(techniciansData.data)) {
        techniciansData.data.forEach((tech: any) => {
          const techId = tech.RecordID;
          const techName = tech.Name || `${tech.FirstName || ''} ${tech.LastName || ''}`.trim() || "Unknown";
          if (techId) {
            technicianJobsMap[techId] = {
              techId: techId,
              name: techName,
              phone: tech.Phone || tech.CellPhone || "",
              email: tech.Email || "",
              totalJobs: 0,
              completedJobs: 0,
              totalValue: 0,
              jobs: []
            };
          }
        });
      }

      jobs.forEach(job => {
        // Group by account
        const accountKey = job.customerId || job.customerName;
        if (!accountsMap[accountKey]) {
          accountsMap[accountKey] = {
            accountId: job.customerId,
            accountName: job.customerName,
            address: job.address,
            totalJobs: 0,
            completedJobs: 0,
            totalValue: 0,
            jobs: []
          };
        }
        accountsMap[accountKey].totalJobs++;
        accountsMap[accountKey].totalValue += job.price || 0;
        if (job.isCompleted) accountsMap[accountKey].completedJobs++;
        accountsMap[accountKey].jobs.push(job);

        // Group by technician
        const techKey = job.technicianId;
        if (techKey && technicianJobsMap[techKey]) {
          technicianJobsMap[techKey].totalJobs++;
          technicianJobsMap[techKey].totalValue += job.price || 0;
          if (job.isCompleted) technicianJobsMap[techKey].completedJobs++;
          technicianJobsMap[techKey].jobs.push(job);
        } else if (techKey) {
          technicianJobsMap[techKey] = {
            techId: techKey,
            name: job.technicianName,
            phone: "",
            email: "",
            totalJobs: 1,
            completedJobs: job.isCompleted ? 1 : 0,
            totalValue: job.price || 0,
            jobs: [job]
          };
        }
      });

      // Convert to arrays and sort, adding commission calculations
      const accounts = Object.values(accountsMap).sort((a, b) => b.totalJobs - a.totalJobs);
      const techniciansRaw = Object.values(technicianJobsMap).sort((a, b) => b.totalJobs - a.totalJobs);
      
      // Add commission calculations (10% and 15% of total value)
      const technicians = techniciansRaw.map(tech => ({
        ...tech,
        commission10: Math.round(tech.totalValue * 0.10 * 100) / 100,
        commission15: Math.round(tech.totalValue * 0.15 * 100) / 100
      }));
      
      const techsWithJobs = technicians.filter(t => t.totalJobs > 0);
      const techsWithoutJobs = technicians.filter(t => t.totalJobs === 0);

      // Calculate totals
      const totalValue = jobs.reduce((sum, j) => sum + (j.price || 0), 0);
      const completedJobs = jobs.filter(j => j.isCompleted);
      const pendingJobs = jobs.filter(j => !j.isCompleted);

      res.json({
        jobs,
        accounts,
        technicians,
        techsWithJobs,
        techsWithoutJobs,
        completedJobs,
        pendingJobs,
        summary: {
          totalJobs: jobs.length,
          completedCount: completedJobs.length,
          pendingCount: pendingJobs.length,
          totalValue: totalValue,
          accountCount: accounts.length,
          technicianCount: technicians.length,
          techsWithJobsCount: techsWithJobs.length
        }
      });
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({
        error: "Failed to fetch jobs",
        message: error.message
      });
    }
  });

  // Get extracted repairs from SR jobs with office notes containing parts/labor/prices
  app.get("/api/jobs/repairs", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      // Calculate date range (last 60 days)
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 60);

      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      // Fetch jobs and details
      const [jobsData, jobDetailsData, techniciansData, customersData] = await Promise.all([
        client.getOneTimeJobList({ fromDate: formatDate(fromDate), toDate: formatDate(toDate), limit: 500 }),
        client.getOneTimeJobListDetails({ fromDate: formatDate(fromDate), toDate: formatDate(toDate), limit: 500 }),
        client.getTechnicianDetail({ limit: 100 }),
        client.getCustomerDetail({ limit: 500 })
      ]);

      // Build lookup maps
      const technicianMap: Record<string, any> = {};
      if (techniciansData.data && Array.isArray(techniciansData.data)) {
        techniciansData.data.forEach((tech: any) => {
          if (tech.RecordID) technicianMap[tech.RecordID] = tech;
        });
      }

      const customerMap: Record<string, any> = {};
      if (customersData.data && Array.isArray(customersData.data)) {
        customersData.data.forEach((cust: any) => {
          if (cust.RecordID) customerMap[cust.RecordID] = cust;
        });
      }

      const jobDetailsMap: Record<string, any> = {};
      if (jobDetailsData.data && Array.isArray(jobDetailsData.data)) {
        jobDetailsData.data.forEach((detail: any) => {
          const jobId = detail.JobID || detail.RecordID;
          if (jobId) jobDetailsMap[jobId] = detail;
        });
      }

      // Filter to SR jobs only (service repairs)
      const srJobs = (jobsData.data || []).filter((job: any) => {
        const title = (job.Title || job.JobTitle || '').toLowerCase();
        return title.includes('"sr"') || 
               title.includes("'sr'") || 
               title.startsWith('sr ') || 
               title.startsWith('sr-') ||
               title.includes(' sr ') ||
               title.includes(' sr-') ||
               /\bsr\b/.test(title);
      });

      // Fetch audit history for SR jobs to get office notes
      const BATCH_SIZE = 10;
      const repairJobs: any[] = [];

      for (let i = 0; i < srJobs.length; i += BATCH_SIZE) {
        const batch = srJobs.slice(i, i + BATCH_SIZE);
        const auditPromises = batch.map(async (job: any) => {
          try {
            const jobId = job.JobID || job.RecordID;
            const auditData = await client.getJobAuditHistory(jobId);
            
            let officeNotes = '';
            let instructions = '';
            
            if (auditData.data && Array.isArray(auditData.data)) {
              const sorted = auditData.data.sort((a: any, b: any) => 
                new Date(b.lastModifiedDate).getTime() - new Date(a.lastModifiedDate).getTime()
              );
              
              for (const entry of sorted) {
                if (entry.field === 'Changed Office Notes' && !officeNotes) {
                  officeNotes = entry.newValue || '';
                }
                if (entry.field === 'Changed Instructions' && !instructions) {
                  instructions = entry.newValue || '';
                }
                if (officeNotes && instructions) break;
              }
            }

            // Parse office notes for repair data
            const parsedRepair = parseOfficeNotesForRepairs(officeNotes);
            const priceExtraction = extractPricesFromNotes(officeNotes);

            // Only include jobs with meaningful repair data
            if (parsedRepair || priceExtraction.prices.length > 0) {
              const jobDetail = jobDetailsMap[jobId] || {};
              const techId = job.TechnicianID || job.AssignedTechnicianID;
              const customerId = job.CustomerID;
              const technician = technicianMap[techId];
              const customer = customerMap[customerId];

              repairJobs.push({
                jobId,
                title: job.Title || job.JobTitle || 'Service Job',
                status: job.JobStatus || job.Status || 'Pending',
                isCompleted: ['Completed', 'Complete', 'Invoiced', 'Closed'].includes(job.JobStatus || job.Status),
                scheduledDate: job.JobDate || job.ScheduledDate,
                technicianId: techId,
                technicianName: technician?.Name || `${technician?.FirstName || ''} ${technician?.LastName || ''}`.trim() || 'Unassigned',
                customerId,
                customerName: customer?.CustomerName || customer?.CompanyName || 'Unknown',
                officeNotes,
                instructions,
                parsedRepair,
                priceExtraction,
                totalRepairValue: parsedRepair?.totalPrice || priceExtraction.total || 0,
                laborAmount: parsedRepair?.totalLabor || 0,
                partsAmount: parsedRepair?.totalParts || 0
              });
            }
          } catch (e) {
            // Silently ignore errors for individual jobs
          }
        });
        await Promise.all(auditPromises);
      }

      // Calculate summary
      const totalLabor = repairJobs.reduce((sum, j) => sum + (j.laborAmount || 0), 0);
      const totalParts = repairJobs.reduce((sum, j) => sum + (j.partsAmount || 0), 0);
      const totalRepairValue = repairJobs.reduce((sum, j) => sum + (j.totalRepairValue || 0), 0);
      const completedRepairs = repairJobs.filter(j => j.isCompleted);

      res.json({
        repairs: repairJobs,
        summary: {
          totalRepairs: repairJobs.length,
          completedRepairs: completedRepairs.length,
          totalLabor,
          totalParts,
          totalRepairValue,
          commission15: Math.round(totalRepairValue * 0.15 * 100) / 100
        }
      });
    } catch (error: any) {
      console.error("Error fetching repairs:", error);
      res.status(500).json({
        error: "Failed to fetch repairs",
        message: error.message
      });
    }
  });

  // Create a new job in Pool Brain
  app.post("/api/jobs/create", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      const { customerId, poolId, technicianId, title, description, scheduledDate, priority } = req.body;

      if (!customerId || !title) {
        return res.status(400).json({ error: "Customer ID and title are required" });
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      const result = await client.createOneTimeJob({
        customerId: parseInt(customerId),
        poolId: poolId ? parseInt(poolId) : undefined,
        technicianId: technicianId ? parseInt(technicianId) : undefined,
        title,
        description,
        scheduledDate,
        priority,
      });

      res.json({
        success: true,
        message: "Job created successfully in Pool Brain",
        job: result,
      });
    } catch (error: any) {
      console.error("Error creating job in Pool Brain:", error);
      res.status(500).json({
        error: "Failed to create job in Pool Brain",
        message: error.message,
      });
    }
  });
}
