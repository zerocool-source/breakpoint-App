import type { Request, Response } from "express";
import { storage } from "../storage";
import ExcelJS from "exceljs";

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
        equipment,
        commissions
      ] = await Promise.all([
        storage.getEstimates(),
        storage.getTechOpsEntries({ startDate: start, endDate: end }),
        storage.getTechnicians(),
        storage.getAllEquipment().catch(() => []),
        storage.getTechOpsCommissions({ startDate: start, endDate: end }).catch(() => ({ technicians: [], totals: {} }))
      ]);

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

  // Equipment report - returns empty data (Pool Brain API disabled)
  app.get("/api/reports/equipment", async (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: [],
      count: 0,
      dateRange: { from: null, to: null },
      hasPartialData: false,
      auditFetchErrors: 0,
      message: "Pool Brain API disabled - use internal data"
    });
  });

  // Equipment report export - disabled
  app.get("/api/reports/equipment/export", async (_req: Request, res: Response) => {
    res.status(501).json({ error: "Equipment report export disabled - Pool Brain API removed" });
  });
}
