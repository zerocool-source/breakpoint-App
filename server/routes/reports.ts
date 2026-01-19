import type { Request, Response } from "express";
import { storage } from "../storage";
import { PoolBrainClient } from "../poolbrain-client";
import ExcelJS from "exceljs";

const EQUIPMENT_PATTERNS = {
  tearDown: /\b(tear[\s\-]?downs?|teardowns?)\b/i,
  deSoot: /\b(de[\s\-]?soots?|desoots?)\b/i,
  heater: /\b(heaters?|heater\s+(?:repair|service|install|replace|maintenance))\b/i,
};

function containsEquipmentKeyword(text: string): string | null {
  if (!text) return null;
  
  if (EQUIPMENT_PATTERNS.tearDown.test(text)) return "Tear Down";
  if (EQUIPMENT_PATTERNS.deSoot.test(text)) return "De-Soot";
  if (EQUIPMENT_PATTERNS.heater.test(text)) return "Heater";
  
  return null;
}

interface EquipmentJobResult {
  id: string;
  date: string;
  propertyName: string;
  customerName: string;
  address: string;
  technicianName: string;
  jobTitle: string;
  equipmentType: string;
  notes: string;
}

interface FetchResult {
  jobs: EquipmentJobResult[];
  hasPartialData: boolean;
  auditFetchErrors: number;
}

async function fetchWithRetry(fn: () => Promise<any>, retries = 3, delay = 1000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i === retries - 1) throw e;
      if (e.message?.includes('429') || e.status === 429) {
        await new Promise(r => setTimeout(r, delay * (i + 1)));
      } else {
        throw e;
      }
    }
  }
}

async function fetchEquipmentJobs(
  client: PoolBrainClient,
  fromDate: Date,
  toDate: Date
): Promise<FetchResult> {
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const BATCH_SIZE = 10;

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

  const fetchAllCustomers = async () => {
    const allCustomers: any[] = [];
    let offset = 0;
    let hasMore = true;
    const limit = 500;

    while (hasMore) {
      try {
        const custData = await client.getCustomerList({ offset, limit });
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
    return { data: allCustomers };
  };

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
    return { data: allJobs };
  };

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
    return { data: allJobs };
  };

  const [techData, customerData, basicJobsData, jobDetailsData] = await Promise.all([
    fetchAllTechnicians(),
    fetchAllCustomers(),
    fetchAllBasicJobs(),
    fetchAllJobDetails()
  ]);

  const technicianMap: Record<string, string> = {};
  if (techData.data) {
    techData.data.forEach((tech: any) => {
      const techId = tech.RecordID || tech.TechnicianID || tech.id;
      const name = tech.Name || tech.TechnicianName || `${tech.FirstName || ''} ${tech.LastName || ''}`.trim();
      if (techId) technicianMap[techId] = name;
    });
  }

  const customerMap: Record<string, any> = {};
  if (customerData.data) {
    customerData.data.forEach((cust: any) => {
      const custId = cust.RecordID || cust.CustomerID || cust.id;
      if (custId) customerMap[custId] = cust;
    });
  }

  const jobDetailsMap: Record<string, any> = {};
  if (jobDetailsData.data) {
    jobDetailsData.data.forEach((detail: any) => {
      const jobId = detail.JobID || detail.RecordID || detail.id;
      if (jobId) jobDetailsMap[jobId] = detail;
    });
  }

  const allJobs: any[] = basicJobsData.data || [];
  
  const auditNotesMap: Record<string, { instructions: string; officeNotes: string }> = {};
  let auditFetchErrors = 0;
  
  for (let i = 0; i < allJobs.length; i += BATCH_SIZE) {
    const batch = allJobs.slice(i, i + BATCH_SIZE);
    const auditPromises = batch.map(async (job) => {
      const jobId = job.JobID || job.RecordID || job.id;
      try {
        const auditData = await fetchWithRetry(
          () => client.getJobAuditHistory(jobId),
          2,
          500
        );
        if (auditData?.data && Array.isArray(auditData.data)) {
          let instructions = '';
          let officeNotes = '';
          
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
          
          auditNotesMap[jobId] = { instructions, officeNotes };
        }
      } catch (e) {
        auditFetchErrors++;
      }
    });
    await Promise.all(auditPromises);
    
    if (i + BATCH_SIZE < allJobs.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  const equipmentJobs: EquipmentJobResult[] = [];
  
  for (const job of allJobs) {
    const jobId = job.JobID || job.RecordID || job.id;
    const jobDetail = jobDetailsMap[jobId] || {};
    const techId = job.TechnicianID || job.technicianId || job.TechnicianId;
    const customerId = job.CustomerId || job.CustomerID || job.customerId;
    const customer = customerId ? customerMap[customerId] : undefined;
    const auditNotes = auditNotesMap[jobId] || { instructions: '', officeNotes: '' };
    
    const fullSearchText = [
      job.Title || job.JobTitle || jobDetail.Title || '',
      job.Description || jobDetail.Description || '',
      job.Notes || jobDetail.Notes || '',
      job.OfficeNotes || jobDetail.OfficeNotes || '',
      job.Instructions || jobDetail.Instructions || '',
      auditNotes.instructions,
      auditNotes.officeNotes,
      ...(jobDetail.OneOfJobItemDetails || job.OneOfJobItemDetails || []).map((item: any) => 
        `${item.ItemName || ''} ${item.Description || ''} ${item.ProductName || ''}`
      )
    ].join(' ');

    const matchedType = containsEquipmentKeyword(fullSearchText);
    
    if (matchedType) {
      const techName = techId ? technicianMap[techId] : 'Unassigned';
      const customerName = customer?.CustomerName || customer?.CompanyName || job.CustomerName || 'Unknown Customer';
      const jobDate = job.JobDate || job.ScheduledDate || job.ServiceDate || jobDetail.ScheduledDate || job.CreatedDate || '';
      const poolName = job.BodyOfWater || job.poolName || jobDetail.BodyOfWater || '';
      
      equipmentJobs.push({
        id: jobId,
        date: jobDate,
        propertyName: poolName || customerName,
        customerName: customerName,
        address: job.ServiceAddress || '',
        technicianName: techName,
        jobTitle: job.Title || job.JobTitle || jobDetail.Title || 'Service Job',
        equipmentType: matchedType,
        notes: auditNotes.officeNotes || auditNotes.instructions || job.OfficeNotes || jobDetail.OfficeNotes || '',
      });
    }
  }

  equipmentJobs.sort((a, b) => {
    const dateA = new Date(a.date || 0);
    const dateB = new Date(b.date || 0);
    return dateB.getTime() - dateA.getTime();
  });

  return {
    jobs: equipmentJobs,
    hasPartialData: auditFetchErrors > 0,
    auditFetchErrors
  };
}

export function registerReportRoutes(app: any) {
  app.get("/api/reports", async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const [
        estimates,
        techOpsEntries,
        technicians,
        commissions
      ] = await Promise.all([
        storage.getEstimates(),
        storage.getTechOpsEntries({ startDate: start, endDate: end }),
        storage.getTechnicians(),
        storage.getTechOpsCommissions({ startDate: start, endDate: end }).catch(() => ({ technicians: [], totals: {} }))
      ]);
      
      const equipment: any[] = [];

      const filteredEstimates = estimates.filter(e => {
        const created = new Date(e.createdAt || 0);
        return created >= start && created <= end;
      });

      const estimatesSent = filteredEstimates.filter(e => e.status !== 'draft');
      const estimatesApproved = filteredEstimates.filter(e => ['approved', 'scheduled', 'completed', 'invoiced'].includes(e.status || ''));
      const invoicedEstimates = filteredEstimates.filter(e => e.status === 'invoiced');

      const serviceRepairs = techOpsEntries.filter(e => e.entryType === 'service_repairs');
      const windyDayCleanups = techOpsEntries.filter(e => e.entryType === 'windy_day_cleanup');
      const chemicalOrders = techOpsEntries.filter(e => e.entryType === 'chemical_order' || e.entryType === 'chemicals_dropoff');

      const totalRevenue = estimatesApproved.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
      const commissionsData = commissions as any;

      const metrics = {
        totalRevenue,
        estimatesSent: {
          count: estimatesSent.length,
          value: estimatesSent.reduce((sum, e) => sum + (e.totalAmount || 0), 0)
        },
        estimatesApproved: {
          count: estimatesApproved.length,
          value: estimatesApproved.reduce((sum, e) => sum + (e.totalAmount || 0), 0)
        },
        invoicesSent: {
          count: invoicedEstimates.length,
          value: invoicedEstimates.reduce((sum, e) => sum + (e.totalAmount || 0), 0)
        },
        invoicesPaid: {
          count: invoicedEstimates.filter(e => (e as any).paidAt).length,
          value: invoicedEstimates.filter(e => (e as any).paidAt).reduce((sum, e) => sum + (e.totalAmount || 0), 0)
        },
        outstandingBalance: invoicedEstimates.filter(e => !(e as any).paidAt).reduce((sum, e) => sum + (e.totalAmount || 0), 0),
        serviceRepairs: {
          count: serviceRepairs.length,
          value: serviceRepairs.reduce((sum, e) => sum + (e.partsCost || 0), 0)
        },
        windyDayCleanups: {
          count: windyDayCleanups.length,
          value: windyDayCleanups.reduce((sum, e) => sum + (e.partsCost || 0), 0)
        },
        chemicalOrders: {
          count: chemicalOrders.length,
          value: 0
        },
        commissionsOwed: commissionsData?.totals?.totalCommission || 0,
        commissionsPaid: 0
      };

      const statusCounts: Record<string, number> = {};
      filteredEstimates.forEach(e => {
        const status = e.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const repairTypeCounts: Record<string, number> = {};
      serviceRepairs.forEach(e => {
        const type = (e as any).repairType || 'General';
        repairTypeCounts[type] = (repairTypeCounts[type] || 0) + 1;
      });

      const technicianRepairCounts: Record<string, number> = {};
      serviceRepairs.forEach(e => {
        const name = e.technicianName || 'Unknown';
        technicianRepairCounts[name] = (technicianRepairCounts[name] || 0) + 1;
      });

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const monthlyData: Record<string, number> = {};
      filteredEstimates.forEach(e => {
        const date = new Date(e.createdAt || 0);
        const monthKey = `${months[date.getMonth()]}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (e.totalAmount || 0);
      });

      const monthlyComparison: Record<string, { estimates: number; invoices: number }> = {};
      filteredEstimates.forEach(e => {
        const date = new Date(e.createdAt || 0);
        const monthKey = `${months[date.getMonth()]}`;
        if (!monthlyComparison[monthKey]) {
          monthlyComparison[monthKey] = { estimates: 0, invoices: 0 };
        }
        monthlyComparison[monthKey].estimates++;
        if (e.status === 'invoiced') {
          monthlyComparison[monthKey].invoices++;
        }
      });

      const charts = {
        revenueBySource: [
          { name: 'Estimates', value: metrics.estimatesApproved.value },
          { name: 'Service Repairs', value: metrics.serviceRepairs.value },
          { name: 'Windy Day', value: metrics.windyDayCleanups.value },
        ].filter(d => d.value > 0),
        estimatesStatusBreakdown: Object.entries(statusCounts).map(([name, value]) => ({ 
          name: name.charAt(0).toUpperCase() + name.slice(1), 
          value 
        })),
        repairsByType: Object.entries(repairTypeCounts).map(([name, value]) => ({ name, value })),
        monthlyRevenue: Object.entries(monthlyData).map(([month, revenue]) => ({ month, revenue })).slice(-6),
        estimatesVsInvoices: Object.entries(monthlyComparison).map(([month, data]) => ({ month, ...data })).slice(-6),
        repairsByTechnician: Object.entries(technicianRepairCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        commissionsByTechnician: (commissionsData?.technicians || [])
          .map((t: any) => ({ name: t.technicianName, amount: t.totalCommission }))
          .filter((t: any) => t.amount > 0)
      };

      const logs = {
        repairs: serviceRepairs.map(e => ({
          date: e.createdAt,
          propertyName: e.propertyName,
          repairType: (e as any).repairType || 'General',
          technicianName: e.technicianName,
          status: e.status,
          revenue: e.partsCost || 0,
          commission: Math.round((e.partsCost || 0) * 0.1)
        })),
        chemicals: chemicalOrders.map(e => ({
          date: e.createdAt,
          propertyName: e.propertyName,
          technicianName: e.technicianName,
          orderType: e.entryType === 'chemical_order' ? 'Order' : 'Drop-off',
          items: e.description?.slice(0, 50) || '',
          status: e.status
        })),
        commissions: (commissionsData?.technicians || []).map((t: any) => ({
          date: new Date(),
          technicianName: t.technicianName,
          propertyName: 'Multiple',
          jobType: 'Service Repairs',
          totalAmount: t.totalPartsCost,
          commissionRate: t.commissionPercent,
          commissionOwed: t.totalCommission,
          paidStatus: 'Pending'
        })),
        equipment: equipment.slice(0, 50).map((e: any) => ({
          dateAdded: e.createdAt,
          propertyName: e.propertyName || 'Unknown',
          equipmentType: e.type || e.equipmentType || 'Unknown',
          model: e.model || '',
          serialNumber: e.serialNumber || '',
          installDate: e.installDate,
          warrantyStatus: e.warrantyExpiry ? (new Date(e.warrantyExpiry) > new Date() ? 'Active' : 'Expired') : 'Unknown'
        })),
        invoices: invoicedEstimates.map(e => ({
          date: e.convertedAt || e.createdAt,
          invoiceNumber: e.estimateNumber,
          propertyName: e.propertyName,
          description: e.title,
          amount: e.totalAmount,
          status: (e as any).paidAt ? 'Paid' : 'Outstanding',
          paidDate: (e as any).paidAt
        }))
      };

      res.json({ metrics, charts, logs });
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.get("/api/reports/equipment", async (req: Request, res: Response) => {
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

      const { fromDate: fromDateParam, toDate: toDateParam } = req.query;
      
      const today = new Date();
      const fromDate = fromDateParam 
        ? new Date(fromDateParam as string) 
        : new Date(today.getFullYear(), 0, 1);
      const toDate = toDateParam 
        ? new Date(toDateParam as string) 
        : today;

      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      const result = await fetchEquipmentJobs(client, fromDate, toDate);

      res.json({
        success: true,
        data: result.jobs,
        count: result.jobs.length,
        dateRange: {
          from: formatDate(fromDate),
          to: formatDate(toDate)
        },
        hasPartialData: result.hasPartialData,
        auditFetchErrors: result.auditFetchErrors
      });
    } catch (error: any) {
      console.error("Error fetching equipment report:", error);
      res.status(500).json({ error: error.message || "Failed to fetch equipment report" });
    }
  });

  app.get("/api/reports/equipment/export", async (req: Request, res: Response) => {
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

      const { fromDate: fromDateParam, toDate: toDateParam } = req.query;
      
      const today = new Date();
      const fromDate = fromDateParam 
        ? new Date(fromDateParam as string) 
        : new Date(today.getFullYear(), 0, 1);
      const toDate = toDateParam 
        ? new Date(toDateParam as string) 
        : today;

      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      const result = await fetchEquipmentJobs(client, fromDate, toDate);
      const equipmentJobs = result.jobs;

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Pool Brain BI';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Equipment Report');

      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Property', key: 'propertyName', width: 30 },
        { header: 'Customer', key: 'customerName', width: 30 },
        { header: 'Technician', key: 'technicianName', width: 20 },
        { header: 'Equipment Type', key: 'equipmentType', width: 15 },
        { header: 'Job Title', key: 'jobTitle', width: 35 },
        { header: 'Notes', key: 'notes', width: 50 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      equipmentJobs.forEach(job => {
        const formattedDate = job.date ? new Date(job.date).toLocaleDateString() : '';
        worksheet.addRow({
          ...job,
          date: formattedDate
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=equipment-report-${formatDate(new Date())}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error: any) {
      console.error("Error exporting equipment report:", error);
      res.status(500).json({ error: error.message || "Failed to export equipment report" });
    }
  });
}
