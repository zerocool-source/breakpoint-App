import type { Request, Response } from "express";
import { storage } from "../storage";
import { PoolBrainClient } from "../poolbrain-client";
import ExcelJS from "exceljs";

const EQUIPMENT_KEYWORDS = [
  "tear down", "teardown", "tear-down",
  "de-soot", "desoot", "de soot",
  "heater", "heaters"
];

function containsEquipmentKeyword(text: string): string | null {
  if (!text) return null;
  const lowerText = text.toLowerCase();
  
  for (const keyword of EQUIPMENT_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      if (keyword.includes("tear")) return "Tear Down";
      if (keyword.includes("soot")) return "De-Soot";
      if (keyword.includes("heater")) return "Heater";
    }
  }
  return null;
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

      const equipmentJobs: any[] = [];

      if (jobsData.data) {
        for (const job of jobsData.data) {
          const searchText = [
            job.JobTitle || job.Title || '',
            job.Description || '',
            job.Notes || '',
            job.OfficeNotes || '',
            ...(job.OneOfJobItemDetails || []).map((item: any) => 
              `${item.ItemName || ''} ${item.Description || ''}`
            )
          ].join(' ');

          const matchedType = containsEquipmentKeyword(searchText);
          
          if (matchedType) {
            const techId = job.TechnicianID || job.TechnicianId || job.technicianId;
            const techName = techId ? technicianMap[techId] : 'Unknown';
            
            const jobDate = job.ScheduledDate || job.DateScheduled || job.JobDate || job.Date;
            
            equipmentJobs.push({
              id: job.JobID || job.RecordID || job.id,
              date: jobDate,
              propertyName: job.PoolName || job.PropertyName || job.CustomerName || 'Unknown Property',
              customerName: job.CustomerName || 'Unknown Customer',
              address: job.Address || job.AddressLine1 || '',
              technicianName: techName,
              jobTitle: job.JobTitle || job.Title || 'Untitled Job',
              equipmentType: matchedType,
              notes: job.Notes || job.OfficeNotes || '',
            });
          }
        }
      }

      equipmentJobs.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB.getTime() - dateA.getTime();
      });

      res.json({
        success: true,
        data: equipmentJobs,
        count: equipmentJobs.length,
        dateRange: {
          from: formatDate(fromDate),
          to: formatDate(toDate)
        }
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

      const equipmentJobs: any[] = [];

      if (jobsData.data) {
        for (const job of jobsData.data) {
          const searchText = [
            job.JobTitle || job.Title || '',
            job.Description || '',
            job.Notes || '',
            job.OfficeNotes || '',
            ...(job.OneOfJobItemDetails || []).map((item: any) => 
              `${item.ItemName || ''} ${item.Description || ''}`
            )
          ].join(' ');

          const matchedType = containsEquipmentKeyword(searchText);
          
          if (matchedType) {
            const techId = job.TechnicianID || job.TechnicianId || job.technicianId;
            const techName = techId ? technicianMap[techId] : 'Unknown';
            
            const jobDate = job.ScheduledDate || job.DateScheduled || job.JobDate || job.Date;
            
            equipmentJobs.push({
              date: jobDate,
              propertyName: job.PoolName || job.PropertyName || job.CustomerName || 'Unknown Property',
              technicianName: techName,
              equipmentType: matchedType,
              jobTitle: job.JobTitle || job.Title || 'Untitled Job',
              notes: job.Notes || job.OfficeNotes || '',
            });
          }
        }
      }

      equipmentJobs.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB.getTime() - dateA.getTime();
      });

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
