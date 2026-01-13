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

  const fetchAllJobs = async () => {
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
        console.error("Error fetching jobs at offset", offset, e);
        break;
      }
    }
    return { data: allJobs };
  };

  const [techData, jobsData] = await Promise.all([
    fetchAllTechnicians(),
    fetchAllJobs()
  ]);

  const technicianMap: Record<string, string> = {};
  if (techData.data) {
    techData.data.forEach((tech: any) => {
      const techId = tech.RecordID || tech.TechnicianID || tech.id;
      const name = tech.TechnicianName || tech.Name || `${tech.FirstName || ''} ${tech.LastName || ''}`.trim();
      if (techId) technicianMap[techId] = name;
    });
  }

  const allJobs: any[] = jobsData.data || [];
  
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
    const auditNotes = auditNotesMap[jobId] || { instructions: '', officeNotes: '' };
    
    const fullSearchText = [
      job.JobTitle || job.Title || '',
      job.Description || '',
      job.Notes || '',
      job.OfficeNotes || '',
      job.Instructions || '',
      auditNotes.instructions,
      auditNotes.officeNotes,
      ...(job.OneOfJobItemDetails || []).map((item: any) => 
        `${item.ItemName || ''} ${item.Description || ''}`
      )
    ].join(' ');

    const matchedType = containsEquipmentKeyword(fullSearchText);
    
    if (matchedType) {
      const techId = job.TechnicianID || job.TechnicianId || job.technicianId;
      const techName = techId ? technicianMap[techId] : 'Unknown';
      const jobDate = job.ScheduledDate || job.DateScheduled || job.JobDate || job.Date;
      
      equipmentJobs.push({
        id: jobId,
        date: jobDate,
        propertyName: job.PoolName || job.PropertyName || job.CustomerName || 'Unknown Property',
        customerName: job.CustomerName || 'Unknown Customer',
        address: job.Address || job.AddressLine1 || '',
        technicianName: techName,
        jobTitle: job.JobTitle || job.Title || 'Untitled Job',
        equipmentType: matchedType,
        notes: auditNotes.officeNotes || auditNotes.instructions || job.Notes || job.OfficeNotes || '',
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
