import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { Job, Technician, RepairTechData } from "./JobTypes";

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

export async function exportJobsExcel(jobs: Job[], technicians: Technician[], summary: { totalJobs: number; completedJobs: number; pendingJobs: number; totalValue: number }) {
  const now = new Date();
  const wb = new ExcelJS.Workbook();
  
  const wsSummary = wb.addWorksheet("Summary");
  wsSummary.columns = [{ header: "Metric", key: "metric" }, { header: "Value", key: "value" }];
  wsSummary.addRow({ metric: "Total Jobs", value: summary.totalJobs });
  wsSummary.addRow({ metric: "Completed Jobs", value: summary.completedJobs });
  wsSummary.addRow({ metric: "Pending Jobs", value: summary.pendingJobs });
  wsSummary.addRow({ metric: "Total Value", value: summary.totalValue });
  wsSummary.addRow({ metric: "Total Technicians", value: technicians.length });
  
  const wsJobs = wb.addWorksheet("All Jobs");
  wsJobs.columns = [
    { header: "Job ID", key: "jobId" }, { header: "Title", key: "title" },
    { header: "Customer", key: "customer" }, { header: "Pool", key: "pool" },
    { header: "Address", key: "address" }, { header: "Technician", key: "tech" },
    { header: "Price", key: "price" }, { header: "Status", key: "status" },
    { header: "Scheduled Date", key: "scheduled" }, { header: "Created Date", key: "created" }
  ];
  jobs.forEach((j) => wsJobs.addRow({
    jobId: j.jobId, title: j.title, customer: j.customerName || "N/A",
    pool: j.poolName || "N/A", address: j.address || "N/A",
    tech: j.technicianName || "Unassigned", price: j.price || 0,
    status: j.isCompleted ? "Completed" : "Pending",
    scheduled: j.scheduledDate ? new Date(j.scheduledDate).toLocaleDateString() : "N/A",
    created: j.createdDate ? new Date(j.createdDate).toLocaleDateString() : "N/A"
  }));
  
  const wsTechs = wb.addWorksheet("Technicians");
  wsTechs.columns = [
    { header: "Technician ID", key: "id" }, { header: "Name", key: "name" },
    { header: "Phone", key: "phone" }, { header: "Email", key: "email" }
  ];
  technicians.forEach((t) => wsTechs.addRow({
    id: t.techId, name: t.name, phone: t.phone || "N/A", email: t.email || "N/A"
  }));
  
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `jobs-report-${now.toISOString().split('T')[0]}.xlsx`);
}

export function exportRepairTechsPDF(repairTechs: RepairTechData[], monthlyQuota: number) {
  const doc = new jsPDF() as JsPDFWithAutoTable;
  const now = new Date();
  
  doc.setFontSize(20);
  doc.setTextColor(8, 145, 178);
  doc.text("Repair Technician Performance Report", 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 14, 28);
  doc.text(`Monthly Quota: $${monthlyQuota.toLocaleString()}`, 14, 35);
  
  const tableData = repairTechs.map(tech => [
    tech.name,
    tech.jobs.length.toString(),
    `$${tech.totalValue.toLocaleString()}`,
    `$${tech.monthlyValue?.toLocaleString() || '0'}`,
    `${tech.quotaPercent || 0}%`,
    `$${tech.commission10?.toLocaleString() || '0'}`,
    `$${tech.commission15?.toLocaleString() || '0'}`
  ]);

  autoTable(doc, {
    startY: 42,
    head: [['Technician', 'Jobs', 'Total Value', 'This Month', 'Quota %', '10% Comm', '15% Comm']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [8, 145, 178], textColor: 255 },
    styles: { fontSize: 9 }
  });

  let yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : 100;
  
  repairTechs.forEach(tech => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(8, 145, 178);
    doc.text(tech.name, 14, yPos);
    yPos += 8;
    
    const jobsData = tech.jobs.slice(0, 10).map((job) => [
      job.title?.substring(0, 30) || 'N/A',
      job.customerName?.substring(0, 25) || 'N/A',
      `$${job.price?.toLocaleString() || '0'}`,
      job.isCompleted ? 'Complete' : 'Pending',
      job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : 'N/A'
    ]);
    
    if (jobsData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Job Title', 'Customer', 'Price', 'Status', 'Date']],
        body: jobsData,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 100], textColor: 255 },
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 }
      });
      yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPos + 50;
    }
  });

  doc.save(`repair-techs-report-${now.toISOString().split('T')[0]}.pdf`);
}

export function exportSRJobsPDF(srJobs: Job[]) {
  const doc = new jsPDF() as JsPDFWithAutoTable;
  const now = new Date();
  
  const jobsByTech: Record<string, Job[]> = {};
  srJobs.forEach(job => {
    const techName = job.technicianName || "Unassigned";
    if (!jobsByTech[techName]) {
      jobsByTech[techName] = [];
    }
    jobsByTech[techName].push(job);
  });
  
  const techStats = Object.entries(jobsByTech).map(([name, jobs]) => {
    const totalValue = jobs.reduce((sum, j) => sum + (j.price || 0), 0);
    const completedCount = jobs.filter(j => j.isCompleted).length;
    return {
      name,
      jobs,
      totalValue,
      completedCount,
      jobCount: jobs.length
    };
  }).sort((a, b) => b.totalValue - a.totalValue);
  
  doc.setFontSize(20);
  doc.setTextColor(8, 145, 178);
  doc.text("SR Jobs - Technician Report", 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 14, 28);
  doc.text(`Total SR Jobs: ${srJobs.length} | Total Value: $${srJobs.reduce((s, j) => s + (j.price || 0), 0).toLocaleString()}`, 14, 35);
  
  const summaryData = techStats.map(tech => [
    tech.name,
    tech.jobCount.toString(),
    `${tech.completedCount}/${tech.jobCount}`,
    `$${tech.totalValue.toLocaleString()}`,
    `$${Math.round(tech.totalValue * 0.10).toLocaleString()}`,
    `$${Math.round(tech.totalValue * 0.15).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 42,
    head: [['Technician', 'Total Jobs', 'Completed', 'Total Value', '10% Comm', '15% Comm']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [8, 145, 178], textColor: 255 },
    styles: { fontSize: 9 }
  });

  let yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : 100;
  
  techStats.forEach(tech => {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(8, 145, 178);
    doc.text(`${tech.name} - ${tech.jobCount} jobs ($${tech.totalValue.toLocaleString()})`, 14, yPos);
    yPos += 8;
    
    const jobsData = tech.jobs.map((job) => [
      job.title?.substring(0, 35) || 'SR Job',
      job.customerName?.substring(0, 20) || 'N/A',
      `$${(job.price || 0).toLocaleString()}`,
      job.isCompleted ? 'Complete' : 'Pending',
      job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : 'N/A'
    ]);
    
    if (jobsData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Job Title', 'Customer', 'Price', 'Status', 'Date']],
        body: jobsData,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 100], textColor: 255 },
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 }
      });
      yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPos + 50;
    }
  });

  doc.save(`sr-jobs-report-${now.toISOString().split('T')[0]}.pdf`);
}

export function exportSRAccountsPDF(srByTechnician: Record<string, Job[]>) {
  const doc = new jsPDF({ orientation: 'landscape' }) as JsPDFWithAutoTable;
  const now = new Date();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const COMMISSION_RATE = 0.15;
  
  const allJobs: Job[] = [];
  Object.values(srByTechnician).forEach(jobs => {
    allJobs.push(...jobs);
  });
  
  const isJobEligible = (job: Job) => {
    const status = job.status?.toLowerCase()?.trim() || '';
    return job.isCompleted === true || 
           status === 'closed' || 
           status === 'completed' || 
           status.includes('closed') || 
           status.includes('complete');
  };
  
  const accountsMap: Record<string, { jobs: (Job & { commission: number; earnedCommission: boolean })[]; totalValue: number; totalCommission: number; completedCount: number; technicians: Set<string>; techCommissions: Record<string, number> }> = {};
  allJobs.forEach((job) => {
    const accountName = job.customerName || "Unknown";
    const eligible = isJobEligible(job);
    const jobCommission = eligible ? (job.price || 0) * COMMISSION_RATE : 0;
    const techName = job.technicianName || 'Unassigned';
    
    if (!accountsMap[accountName]) {
      accountsMap[accountName] = { jobs: [], totalValue: 0, totalCommission: 0, completedCount: 0, technicians: new Set(), techCommissions: {} };
    }
    accountsMap[accountName].jobs.push({ ...job, commission: jobCommission, earnedCommission: eligible });
    accountsMap[accountName].totalValue += job.price || 0;
    if (eligible) {
      accountsMap[accountName].totalCommission += jobCommission;
    }
    if (eligible) accountsMap[accountName].completedCount++;
    if (job.technicianName) accountsMap[accountName].technicians.add(job.technicianName);
    
    if (!accountsMap[accountName].techCommissions[techName]) {
      accountsMap[accountName].techCommissions[techName] = 0;
    }
    if (eligible) {
      accountsMap[accountName].techCommissions[techName] += jobCommission;
    }
  });
  
  const accounts = Object.entries(accountsMap)
    .map(([name, data]) => ({
      name,
      ...data,
      technicianList: Array.from(data.technicians).join(", "),
      jobCount: data.jobs.length,
      readyToInvoice: data.completedCount === data.jobs.length && data.jobs.length > 0,
      over500: data.totalValue >= 500
    }))
    .sort((a, b) => b.totalValue - a.totalValue);
  
  doc.setFontSize(16);
  doc.setTextColor(51, 65, 85);
  doc.text("SR JOBS - ACCOUNT INVOICE REPORT", 10, 12);
  
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, pageWidth - 10, 12, { align: 'right' });
  
  const totalValue = allJobs.reduce((s, j) => s + (j.price || 0), 0);
  const eligibleJobs = allJobs.filter(isJobEligible);
  const completedValue = eligibleJobs.reduce((s, j) => s + (j.price || 0), 0);
  const totalCommission = completedValue * COMMISSION_RATE;
  const readyAccounts = accounts.filter(a => a.readyToInvoice);
  const readyValue = readyAccounts.reduce((s, a) => s + a.totalValue, 0);
  const over500Count = accounts.filter(a => a.over500).length;
  
  doc.setFontSize(8);
  doc.setTextColor(60);
  doc.text(`${accounts.length} Accounts | ${allJobs.length} Jobs | Total: $${totalValue.toLocaleString()} | Ready: $${readyValue.toLocaleString()} | Over $500: ${over500Count}`, 10, 18);
  doc.setTextColor(16, 150, 100);
  doc.text(`Commissions (15% on ${eligibleJobs.length} done): $${totalCommission.toFixed(2)}`, pageWidth - 10, 18, { align: 'right' });
  
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(10, 21, pageWidth - 10, 21);
  
  let yPos = 25;
  
  accounts.forEach(account => {
    if (yPos > 180) {
      doc.addPage();
      yPos = 12;
    }
    
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.text(account.name, 10, yPos);
    
    let badgeX = 10 + doc.getTextWidth(account.name) + 3;
    doc.setFont('helvetica', 'normal');
    
    if (account.over500) {
      doc.setFillColor(220, 38, 38);
      doc.roundedRect(badgeX, yPos - 3, 18, 4, 0.5, 0.5, 'F');
      doc.setFontSize(6);
      doc.setTextColor(255);
      doc.text("OVER $500", badgeX + 1.5, yPos - 0.5);
      badgeX += 20;
    }
    
    if (account.readyToInvoice) {
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(badgeX, yPos - 3, 22, 4, 0.5, 0.5, 'F');
      doc.setFontSize(6);
      doc.setTextColor(255);
      doc.text("READY TO INVOICE", badgeX + 1, yPos - 0.5);
    }
    
    doc.setFontSize(8);
    doc.setTextColor(80);
    const summaryText = `${account.completedCount}/${account.jobCount} done | $${account.totalValue.toLocaleString()} | Comm: $${account.totalCommission.toFixed(2)}`;
    doc.text(summaryText, pageWidth - 10, yPos, { align: 'right' });
    
    yPos += 4;
    
    const jobsData: (string | number)[][] = [];
    
    account.jobs.forEach((job) => {
      const items = job.items || [];
      const productsText = items.length > 0 
        ? items.map((item) => `${item.productName || 'Item'} x${item.qty}`).join(', ')
        : '-';
      
      const officeNotes = job.officeNotes || '';
      const instructions = job.instructions || '';
      const notesText = [officeNotes, instructions].filter(Boolean).join(' | ') || '-';
      
      jobsData.push([
        job.title || 'SR Job',
        job.technicianName || '-',
        productsText,
        notesText,
        `$${(job.price || 0).toLocaleString()}`,
        job.earnedCommission ? `$${(job.commission || 0).toFixed(2)}` : '-',
        job.isCompleted ? 'Done' : (job.status || 'Pending')
      ]);
    });
    
    autoTable(doc, {
      startY: yPos,
      head: [['Job Title', 'Tech', 'Products', 'Office Notes', 'Price', 'Comm', 'Status']],
      body: jobsData,
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 7, cellPadding: 1.5, fontStyle: 'bold' },
      styles: { fontSize: 6.5, cellPadding: 1.5, overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.1 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 130 },
        4: { cellWidth: 18, halign: 'right' },
        5: { cellWidth: 16, halign: 'right' },
        6: { cellWidth: 18, halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.column.index === 6 && data.cell.raw === 'Done') {
          data.cell.styles.textColor = [16, 150, 100];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 5 && data.section === 'body' && data.cell.raw !== '-') {
          data.cell.styles.textColor = [16, 150, 100];
        }
        if (data.column.index === 3 && data.section === 'body' && data.cell.raw !== '-') {
          data.cell.styles.textColor = [140, 70, 10];
          data.cell.styles.fontSize = 6;
        }
      },
      margin: { left: 5, right: 5 },
      tableWidth: 'auto'
    });
    
    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 6 : yPos + 20;
  });
  
  doc.save(`sr-accounts-invoice-report-${now.toISOString().split('T')[0]}.pdf`);
}
