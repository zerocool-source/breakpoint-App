import XLSX from 'xlsx';

const API_BASE = 'http://localhost:5000';

interface ExcelRow {
  supervisor: string;
  technician: string;
  zone: string;
  propertyName: string;
  summerSchedule: string;
  winterSchedule: string;
}

function parseScheduleToDays(schedule: string): string[] {
  if (!schedule) return [];
  const s = schedule.toUpperCase().replace(/\./g, '').replace(/,/g, '').trim();
  
  if (s.includes('6 DAYS') || s.includes('6-DAYS')) {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }
  if (s.includes('MON - FRI') || s.includes('MON-FRI') || s === 'M T W T F') {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  }
  if (s.includes('1 DAY A WEEK') || s.includes('1 DAY')) {
    return ['Mon'];
  }
  
  const days: string[] = [];
  if (s.includes('M ') || s.startsWith('M') || s.includes(' M') || s.includes('MON')) days.push('Mon');
  if (s.includes(' T ') || s.includes('TU') || (s.includes('T') && !s.includes('TH') && s.includes('W'))) {
    if (s.match(/\bT\b/) && s.includes('W')) days.push('Tue');
  }
  if (s.includes('W') || s.includes('WED')) days.push('Wed');
  if (s.includes('TH') || s.includes('THU')) days.push('Thu');
  if (s.includes(' F') || s.includes('FRI') || s.endsWith('F') || s.includes('F ')) days.push('Fri');
  if (s.includes(' S') || s.includes('SAT') || s.endsWith('S') || s.includes('S ')) {
    if (!s.includes('SUN')) days.push('Sat');
  }
  
  if (days.length === 0 && s.includes('M') && s.includes('F')) {
    if (s.includes('W')) {
      return ['Mon', 'Wed', 'Fri'];
    }
    return ['Mon', 'Fri'];
  }
  
  return [...new Set(days)];
}

function matchTechnicianName(excelName: string, dbTechnicians: any[]): any | null {
  const nameParts = excelName.replace('.', '').trim().split(' ');
  const firstName = nameParts[0].toLowerCase();
  const lastInitial = nameParts[1]?.toLowerCase() || '';
  
  // Special name mappings
  const nameMapping: Record<string, string> = {
    'vino': 'gavino',
    'mike': 'michael',
    'kenny': 'kenneth',
  };
  
  const mappedFirstName = nameMapping[firstName] || firstName;
  
  for (const tech of dbTechnicians) {
    const techFirst = tech.firstName?.toLowerCase() || '';
    const techLast = tech.lastName?.toLowerCase() || '';
    
    if (techFirst === mappedFirstName || techFirst === firstName) {
      if (lastInitial && techLast.startsWith(lastInitial.replace('.', ''))) {
        return tech;
      }
      if (!lastInitial) {
        return tech;
      }
    }
  }
  
  for (const tech of dbTechnicians) {
    const techFirst = tech.firstName?.toLowerCase() || '';
    if (techFirst === mappedFirstName || techFirst === firstName) {
      return tech;
    }
  }
  
  return null;
}

function matchSupervisor(excelSupervisor: string, dbTechnicians: any[]): any | null {
  const supervisorMapping: Record<string, string> = {
    'alfred - mid county': 'alfred',
    'paul - s. county': 'paul',
    'richard - north county': 'richard',
  };
  
  const supervisorName = supervisorMapping[excelSupervisor.toLowerCase()] || excelSupervisor.split(' ')[0].toLowerCase();
  
  for (const tech of dbTechnicians) {
    if ((tech.role === 'supervisor' || tech.role === 'foreman') && 
        tech.firstName?.toLowerCase() === supervisorName) {
      return tech;
    }
  }
  return null;
}

async function main() {
  console.log('Reading Excel file...');
  const workbook = XLSX.readFile('attached_assets/Breakpoint_Service_Schedules_1769702103589.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  const rows: ExcelRow[] = rawData
    .slice(3)
    .filter(row => row.length >= 4 && row[3])
    .map(row => ({
      supervisor: row[0] || '',
      technician: row[1] || '',
      zone: row[2] || '',
      propertyName: (row[3] || '').replace(/\*/g, '').trim(),
      summerSchedule: row[4] || '',
      winterSchedule: row[5] || '',
    }));
  
  console.log(`Found ${rows.length} property assignments in Excel`);
  
  console.log('Fetching technicians from database...');
  const techRes = await fetch(`${API_BASE}/api/technicians/stored`);
  const techData = await techRes.json();
  const technicians = techData.technicians || [];
  console.log(`Found ${technicians.length} technicians in database`);
  
  console.log('Fetching customers (properties) from database...');
  const custRes = await fetch(`${API_BASE}/api/customers`);
  const custData = await custRes.json();
  const customers = custData.customers || [];
  console.log(`Found ${customers.length} customers in database`);
  
  console.log('Fetching existing property assignments...');
  const assignRes = await fetch(`${API_BASE}/api/technician-properties/calendar`);
  const assignData = await assignRes.json();
  const existingAssignments = assignData.assignments || [];
  console.log(`Found ${existingAssignments.length} existing assignments`);
  
  const processed: string[] = [];
  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const row of rows) {
    const tech = matchTechnicianName(row.technician, technicians);
    if (!tech) {
      errors.push(`Could not find technician: ${row.technician}`);
      skipped++;
      continue;
    }
    
    const propertyNameLower = row.propertyName.toLowerCase();
    const customer = customers.find((c: any) => {
      const name = (c.name || c.companyName || '').toLowerCase();
      return name.includes(propertyNameLower) || propertyNameLower.includes(name.split(' ')[0]);
    });
    
    if (!customer) {
      errors.push(`Could not find property: ${row.propertyName} (tech: ${row.technician})`);
      skipped++;
      continue;
    }
    
    const summerDays = parseScheduleToDays(row.summerSchedule);
    const winterDays = parseScheduleToDays(row.winterSchedule);
    
    console.log(`Processing: ${row.propertyName} -> ${tech.firstName} ${tech.lastName} (Summer: ${summerDays.join(',')} Winter: ${winterDays.join(',')})`);
    
    const existingAssignment = existingAssignments.find((a: any) => 
      a.technicianId === tech.id && a.propertyId === customer.id
    );
    
    if (existingAssignment) {
      try {
        const updateRes = await fetch(`${API_BASE}/api/technician-properties/${existingAssignment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summerVisitDays: summerDays,
            winterVisitDays: winterDays,
          }),
        });
        if (updateRes.ok) {
          updated++;
        } else {
          errors.push(`Failed to update: ${row.propertyName} for ${row.technician}`);
        }
      } catch (e) {
        errors.push(`Error updating ${row.propertyName}: ${e}`);
      }
    } else {
      try {
        const createRes = await fetch(`${API_BASE}/api/technician-properties`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            technicianId: tech.id,
            propertyId: customer.id,
            summerVisitDays: summerDays,
            winterVisitDays: winterDays,
            activeSeason: 'summer',
          }),
        });
        if (createRes.ok) {
          created++;
        } else {
          const errText = await createRes.text();
          errors.push(`Failed to create: ${row.propertyName} for ${row.technician}: ${errText}`);
        }
      } catch (e) {
        errors.push(`Error creating ${row.propertyName}: ${e}`);
      }
    }
    
    processed.push(`${row.propertyName} -> ${tech.firstName} ${tech.lastName}`);
  }
  
  console.log('\n========== SUMMARY ==========');
  console.log(`Total rows: ${rows.length}`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`\nErrors (${errors.length}):`);
  errors.forEach(e => console.log(`  - ${e}`));
}

main().catch(console.error);
