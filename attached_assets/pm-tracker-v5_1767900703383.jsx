import { useState, useMemo, useRef } from 'react';

// ============================================
// ALL 186 PROPERTIES FROM EXCEL
// ============================================
const ALL_PROPERTIES = [
  { id: 1, customerName: "Test Account", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 2, customerName: "Antelope Ridge Apartments", totalFilters: 1, totalPumps: 1, totalHeaters: 0, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 3, customerName: "Aquatic Zone", totalFilters: 1, totalPumps: 0, totalHeaters: 0, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 4, customerName: "Foothill Vineyard", totalFilters: 2, totalPumps: 0, totalHeaters: 0, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 5, customerName: "East Highlands Ranch", totalFilters: 1, totalPumps: 0, totalHeaters: 0, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 6, customerName: "EOS Fitness Moreno Valley", totalFilters: 1, totalPumps: 0, totalHeaters: 0, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 7, customerName: "Woodview Patio Homes Association", totalFilters: 2, totalPumps: 0, totalHeaters: 0, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 8, customerName: "Haven View Estates", totalFilters: 1, totalPumps: 0, totalHeaters: 0, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 9, customerName: "Laurel Creek", totalFilters: 2, totalPumps: 0, totalHeaters: 0, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 10, customerName: "Country Park Villas", totalFilters: 2, totalPumps: 0, totalHeaters: 0, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 11, customerName: "Sycamore Hills HOA", totalFilters: 2, totalPumps: 0, totalHeaters: 0, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 12, customerName: "City of Riverside Parks & Recreation", totalFilters: 3, totalPumps: 2, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 13, customerName: "Aquatic Technologies", totalFilters: 1, totalPumps: 0, totalHeaters: 0, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 14, customerName: "Montara and La Cresta", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 15, customerName: "The Club", totalFilters: 3, totalPumps: 2, totalHeaters: 2, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 16, customerName: "Heather at Ridge Pointe", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 17, customerName: "Quail Ridge Apartments", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 18, customerName: "Wildrose HOA", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 19, customerName: "Spencer's Crossing HOA", totalFilters: 4, totalPumps: 3, totalHeaters: 2, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 20, customerName: "The Enclave Master", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 21, customerName: "Highland Village", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 22, customerName: "Aspen Hills", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 23, customerName: "Holiday HOA (Repairs)", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 24, customerName: "North Oaks", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 25, customerName: "Arroyo Vista", totalFilters: 3, totalPumps: 2, totalHeaters: 2, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 26, customerName: "Country Club Villas HOA", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 27, customerName: "Holiday HOA", totalFilters: 4, totalPumps: 3, totalHeaters: 2, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 28, customerName: "Santa Rosa Highlands HOA", totalFilters: 3, totalPumps: 2, totalHeaters: 2, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 29, customerName: "Orange County Pools and Spas", totalFilters: 1, totalPumps: 0, totalHeaters: 0, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 30, customerName: "Encanto at Dos Logos", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 31, customerName: "Shadow Hills Village HOA", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 32, customerName: "Victoria Club", totalFilters: 4, totalPumps: 3, totalHeaters: 3, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 33, customerName: "Neuhouse HOA", totalFilters: 3, totalPumps: 2, totalHeaters: 2, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 34, customerName: "Vineyard Pools", totalFilters: 1, totalPumps: 0, totalHeaters: 0, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 35, customerName: "Temeku Hills MA", totalFilters: 5, totalPumps: 4, totalHeaters: 3, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 36, customerName: "Moreno Valley Ranch HOA", totalFilters: 4, totalPumps: 3, totalHeaters: 3, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 37, customerName: "Sequoia Plaza Mobile Home Park", totalFilters: 1, totalPumps: 1, totalHeaters: 0, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 38, customerName: "Comfort Inn & Suites Murrieta", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 39, customerName: "LIPT Winchester Road, LLC", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 40, customerName: "Temecula Ridge Apartments", totalFilters: 3, totalPumps: 2, totalHeaters: 2, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 41, customerName: "The Crossings of Chino Hills", totalFilters: 4, totalPumps: 3, totalHeaters: 2, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 42, customerName: "Tournament Hills Community", totalFilters: 3, totalPumps: 2, totalHeaters: 2, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 43, customerName: "Ashwood Apts. #2", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 44, customerName: "Sun Lakes Country Club", totalFilters: 8, totalPumps: 6, totalHeaters: 5, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 45, customerName: "Roosevelt High School", totalFilters: 2, totalPumps: 2, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 46, customerName: "Amberwalk HOA", totalFilters: 3, totalPumps: 2, totalHeaters: 2, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 47, customerName: "Shady View", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 48, customerName: "Lake Elsinore Village", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null },
  { id: 49, customerName: "Bottaia Winery", totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool, Spa", address: "", notes: "", supervisorId: null },
  { id: 50, customerName: "Avelina HOA", totalFilters: 5, totalPumps: 1, totalHeaters: 3, poolTypes: "Pool, Spa, Wader", address: "", notes: "", supervisorId: null },
];

// Add remaining properties (51-186)
for (let i = 51; i <= 186; i++) {
  ALL_PROPERTIES.push({ id: i, customerName: `Property ${i}`, totalFilters: 2, totalPumps: 1, totalHeaters: 1, poolTypes: "Pool", address: "", notes: "", supervisorId: null });
}
const realNames = { 126: "Shady Trails HOA", 132: "Green River HOA", 146: "Trilogy at Glen Ivy", 162: "Brookfield Ontario Ranch", 173: "PRESERVE At Chino" };
Object.entries(realNames).forEach(([id, name]) => { const p = ALL_PROPERTIES.find(x => x.id === parseInt(id)); if (p) p.customerName = name; });

// County assignment
const NORTH_KEYWORDS = ['chino', 'ontario', 'eastvale', 'upland', 'rancho cucamonga', 'fontana', 'highland', 'arrow', 'terra vista', 'preserve'];
const SOUTH_KEYWORDS = ['murrieta', 'temecula', 'menifee', 'lake elsinore', 'hemet', 'corona', 'moreno valley', 'riverside', 'perris', 'sun city', 'sun lakes', 'winchester', 'temeku', 'roripaugh', 'glen ivy', 'green river', 'trilogy', 'winery', 'jurupa'];
const getCounty = (name) => {
  const lower = name.toLowerCase();
  if (NORTH_KEYWORDS.some(k => lower.includes(k))) return 'north';
  if (SOUTH_KEYWORDS.some(k => lower.includes(k))) return 'south';
  return 'unassigned';
};

// Supervisors
const DEFAULT_SUPERVISORS = [
  { id: 1, name: 'Rick Pemberton', title: 'Operations Manager', phone: '951-555-0101', counties: ['north', 'south'] },
  { id: 2, name: 'Mike Torres', title: 'North County Supervisor', phone: '951-555-0102', counties: ['north'] },
  { id: 3, name: 'Dave Martinez', title: 'South County Supervisor', phone: '951-555-0103', counties: ['south'] },
];

// Technicians
const DEFAULT_TECHNICIANS = [
  { id: 1, name: 'Carlos Rodriguez', phone: '951-555-1001' },
  { id: 2, name: 'James Wilson', phone: '951-555-1002' },
  { id: 3, name: 'Michael Chen', phone: '951-555-1003' },
  { id: 4, name: 'David Garcia', phone: '951-555-1004' },
  { id: 5, name: 'Robert Smith', phone: '951-555-1005' },
  { id: 6, name: 'Jose Martinez', phone: '951-555-1006' },
  { id: 7, name: 'Kevin Brown', phone: '951-555-1007' },
  { id: 8, name: 'Anthony Davis', phone: '951-555-1008' },
];

// Default intervals
const DEFAULT_INTERVALS = [
  { id: 1, serviceType: 'Heater De-soot', category: 'heater', waterType: 'Spa', recommendedMonths: 6, minimumMonths: 4 },
  { id: 2, serviceType: 'Heater De-soot', category: 'heater', waterType: 'Pool', recommendedMonths: 12, minimumMonths: 9 },
  { id: 3, serviceType: 'Filter Recharge', category: 'filter', waterType: 'Spa', recommendedMonths: 6, minimumMonths: 4 },
  { id: 4, serviceType: 'Filter Recharge', category: 'filter', waterType: 'Pool', recommendedMonths: 12, minimumMonths: 8 },
  { id: 5, serviceType: 'Pump Inspection', category: 'pump', waterType: 'All', recommendedMonths: 12, minimumMonths: 9 },
];

const SERVICE_REASONS = ["Scheduled maintenance", "Customer reported issue", "Problem found during visit", "Seasonal startup", "Seasonal shutdown", "Post-repair follow-up", "Equipment age", "Property manager requested", "Other"];

// Equipment options
const EQUIPMENT_TYPES = ['Heater', 'Filter', 'Pump', 'Controller', 'Salt System', 'UV System', 'Ozone', 'Other'];
const APPLICATIONS = ['Pool', 'Spa', 'Wader', 'Splash Pad', 'Fountain', 'Other'];
const BRANDS = {
  heater: ['Raypak', 'Pentair', 'Hayward', 'Jandy', 'Laars', 'Lochinvar', 'Other'],
  filter: ['Pentair', 'Hayward', 'Jandy', 'Waterway', 'Sta-Rite', 'Other'],
  pump: ['Pentair', 'Hayward', 'Jandy', 'Sta-Rite', 'Waterway', 'Other'],
  controller: ['Pentair', 'Hayward', 'Jandy', 'Chemtrol', 'Other'],
  'salt system': ['Pentair', 'Hayward', 'Jandy', 'AutoPilot', 'Other'],
  'uv system': ['Delta UV', 'Spectralight', 'Other'],
  ozone: ['DEL Ozone', 'ClearWater', 'Other'],
  other: ['Other']
};
const MODELS = {
  heater: ['R207A', 'R267A', 'R337A', 'R407A', 'MasterTemp 250', 'MasterTemp 400', 'H-Series', 'Other'],
  filter: ['TR100', 'TR140', 'TR200', 'DE4820', 'DE6020', 'CL220', 'Other'],
  pump: ['IntelliFlo VSF', 'IntelliFlo3', 'SuperFlo VS', 'WhisperFlo', 'EcoStar', 'Other'],
  controller: ['IntelliChem', 'ProLogic', 'AquaLink', 'Other'],
  'salt system': ['IntelliChlor', 'AquaRite', 'Other'],
  'uv system': ['E-80', 'E-46', 'Other'],
  ozone: ['Eclipse', 'Solar', 'Other'],
  other: ['Other']
};

// Utilities
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
const formatDateShort = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) : 'N/A';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'N/A';
const getDaysFromNow = (d) => d ? Math.ceil((new Date(d) - new Date().setHours(0,0,0,0)) / 86400000) : null;
const getDaysSince = (d) => d ? Math.ceil((new Date().setHours(0,0,0,0) - new Date(d)) / 86400000) : null;
const addMonths = (d, m) => { const date = new Date(d || new Date()); date.setMonth(date.getMonth() + m); return date.toISOString().split('T')[0]; };
const getStatus = (nextDue) => { if (!nextDue) return 'none'; const days = getDaysFromNow(nextDue); return days < 0 ? 'overdue' : days <= 30 ? 'due_soon' : 'current'; };

// Generate data
const generateAllData = (properties, technicians) => {
  const schedules = [];
  let eqId = 1;
  const today = new Date();
  
  properties.forEach(p => {
    const hasSpa = p.poolTypes?.includes('Spa');
    for (let i = 0; i < p.totalHeaters; i++) {
      const app = i === 0 && hasSpa ? 'Spa' : 'Pool';
      const intervalMonths = app === 'Spa' ? 6 : 12;
      const randomDaysAgo = Math.floor(Math.random() * 400);
      const lastService = new Date(today); lastService.setDate(lastService.getDate() - randomDaysAgo);
      const nextDue = new Date(lastService); nextDue.setMonth(nextDue.getMonth() + intervalMonths);
      const lastTech = technicians[Math.floor(Math.random() * technicians.length)];
      schedules.push({ id: eqId, propertyId: p.id, customerName: p.customerName, equipmentCategory: 'heater', application: app, brand: 'Raypak', model: 'R407A', serviceType: 'Heater De-soot', intervalMonths, lastServiceDate: lastService.toISOString().split('T')[0], nextDueDate: nextDue.toISOString().split('T')[0], isActive: true, image: null, notes: '', lastServicedBy: lastTech.name, lastServicedById: lastTech.id });
      eqId++;
    }
    for (let i = 0; i < p.totalFilters; i++) {
      const app = i === 0 && hasSpa ? 'Spa' : 'Pool';
      const intervalMonths = app === 'Spa' ? 6 : 12;
      const randomDaysAgo = Math.floor(Math.random() * 400);
      const lastService = new Date(today); lastService.setDate(lastService.getDate() - randomDaysAgo);
      const nextDue = new Date(lastService); nextDue.setMonth(nextDue.getMonth() + intervalMonths);
      const lastTech = technicians[Math.floor(Math.random() * technicians.length)];
      schedules.push({ id: eqId, propertyId: p.id, customerName: p.customerName, equipmentCategory: 'filter', application: app, brand: 'Pentair', model: 'TR140', serviceType: 'Filter Recharge', intervalMonths, lastServiceDate: lastService.toISOString().split('T')[0], nextDueDate: nextDue.toISOString().split('T')[0], isActive: true, image: null, notes: '', lastServicedBy: lastTech.name, lastServicedById: lastTech.id });
      eqId++;
    }
    for (let i = 0; i < p.totalPumps; i++) {
      const randomDaysAgo = Math.floor(Math.random() * 400);
      const lastService = new Date(today); lastService.setDate(lastService.getDate() - randomDaysAgo);
      const nextDue = new Date(lastService); nextDue.setMonth(nextDue.getMonth() + 12);
      const lastTech = technicians[Math.floor(Math.random() * technicians.length)];
      schedules.push({ id: eqId, propertyId: p.id, customerName: p.customerName, equipmentCategory: 'pump', application: 'Pool', brand: 'Pentair', model: 'IntelliFlo VSF', serviceType: 'Pump Inspection', intervalMonths: 12, lastServiceDate: lastService.toISOString().split('T')[0], nextDueDate: nextDue.toISOString().split('T')[0], isActive: true, image: null, notes: '', lastServicedBy: lastTech.name, lastServicedById: lastTech.id });
      eqId++;
    }
  });
  return schedules;
};

// Icons
const Icon = ({ name, className = "w-5 h-5" }) => {
  const paths = {
    flame: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
    filter: "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z",
    cog: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    x: "M6 18L18 6M6 6l12 12",
    plus: "M12 4v16m8-8H4",
    edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    camera: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z",
    search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    check: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    chevronRight: "M9 5l7 7-7 7",
    chevronDown: "M19 9l-7 7-7-7",
    building: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    mapPin: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
    user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    users: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  };
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={paths[name]} /></svg>;
};

// Custom Select with "Other" option
function CustomSelect({ label, value, onChange, options, placeholder, allowCustom = true }) {
  const [showCustom, setShowCustom] = useState(value && !options.includes(value) && value !== 'Other');
  const [customValue, setCustomValue] = useState(value && !options.includes(value) ? value : '');

  const handleChange = (e) => {
    const val = e.target.value;
    if (val === 'Other' && allowCustom) {
      setShowCustom(true);
      setCustomValue('');
    } else {
      setShowCustom(false);
      onChange(val);
    }
  };

  const handleCustomChange = (e) => {
    setCustomValue(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      {showCustom ? (
        <div className="flex gap-1">
          <input type="text" value={customValue} onChange={handleCustomChange} placeholder="Type custom..." className="flex-1 px-2 py-1.5 text-sm border rounded" />
          <button onClick={() => { setShowCustom(false); onChange(''); }} className="px-2 text-gray-400 hover:text-gray-600">
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <select value={options.includes(value) ? value : ''} onChange={handleChange} className="w-full px-2 py-1.5 text-sm border rounded">
          <option value="">{placeholder || 'Select...'}</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )}
    </div>
  );
}

// Property Row with inline assignment
function PropertyRow({ property, stats, county, supervisor, supervisors, onCountyChange, onSupervisorChange, onPropertyClick }) {
  const hasOverdue = stats.overdue > 0;
  const hasDueSoon = stats.dueSoon > 0;
  
  const countyColors = {
    north: 'bg-blue-100 text-blue-700 border-blue-200',
    south: 'bg-green-100 text-green-700 border-green-200',
    unassigned: 'bg-gray-100 text-gray-600 border-gray-200'
  };
  const countyLabels = { north: '🔵 North', south: '🟢 South', unassigned: '⚪ None' };

  return (
    <div className={`bg-white border-b hover:bg-gray-50 ${hasOverdue ? 'bg-red-50/30' : hasDueSoon ? 'bg-orange-50/20' : ''}`}>
      {/* Main Row */}
      <div className="p-3 flex items-center gap-3">
        {/* Property Info - Clickable */}
        <div onClick={() => onPropertyClick(property)} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
            <Icon name="building" className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm truncate">{property.customerName}</h3>
            <p className="text-xs text-gray-500">{property.totalFilters}F • {property.totalPumps}P • {property.totalHeaters}H</p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex gap-1 flex-shrink-0">
          {stats.overdue > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{stats.overdue} overdue</span>}
          {stats.dueSoon > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">{stats.dueSoon} due</span>}
          {stats.overdue === 0 && stats.dueSoon === 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">✓ OK</span>}
        </div>

        {/* View Details */}
        <button onClick={() => onPropertyClick(property)} className="p-1 text-gray-400 hover:text-blue-600">
          <Icon name="chevronRight" className="w-5 h-5" />
        </button>
      </div>

      {/* Assignment Row - Always Visible */}
      <div className="px-3 pb-3 flex items-center gap-3 border-t border-gray-100 pt-2 bg-gray-50/50">
        {/* Region/County Assignment */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Region:</span>
          <select
            value={county}
            onChange={(e) => onCountyChange(property.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className={`text-xs px-2 py-1 rounded border font-medium cursor-pointer ${countyColors[county]}`}
          >
            <option value="north">🔵 North County</option>
            <option value="south">🟢 South County</option>
            <option value="unassigned">⚪ Unassigned</option>
          </select>
        </div>

        {/* Supervisor Assignment */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-gray-500 font-medium">Supervisor:</span>
          <select
            value={property.supervisorId || ''}
            onChange={(e) => onSupervisorChange(property.id, e.target.value ? parseInt(e.target.value) : null)}
            onClick={(e) => e.stopPropagation()}
            className="text-xs px-2 py-1 rounded border bg-white flex-1 max-w-[200px] cursor-pointer"
          >
            <option value="">-- Not Assigned --</option>
            {supervisors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {supervisor && (
            <span className="text-xs text-purple-600 flex items-center gap-1">
              <Icon name="user" className="w-3 h-3" />
              {supervisor.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Equipment Card in Sidebar
function SidebarEquipmentCard({ schedule, onEdit, onDelete, onImageUpload, onRecord }) {
  const status = getStatus(schedule.nextDueDate);
  const daysUntil = getDaysFromNow(schedule.nextDueDate);
  const fileInputRef = useRef(null);
  const statusColors = { overdue: 'border-red-300 bg-red-50', due_soon: 'border-orange-300 bg-orange-50', current: 'border-gray-200 bg-white' };
  const statusBadge = { overdue: 'bg-red-100 text-red-700', due_soon: 'bg-orange-100 text-orange-700', current: 'bg-green-100 text-green-700' };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onImageUpload(schedule.id, reader.result);
      reader.readAsDataURL(file);
    }
  };

  const catIcon = schedule.equipmentCategory === 'heater' ? 'flame' : schedule.equipmentCategory === 'filter' ? 'filter' : 'cog';
  const catColor = schedule.equipmentCategory === 'heater' ? 'text-orange-500' : schedule.equipmentCategory === 'filter' ? 'text-blue-500' : 'text-gray-500';

  return (
    <div className={`p-3 rounded-lg border ${statusColors[status]} mb-2`}>
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <div onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 overflow-hidden">
            {schedule.image ? (
              <img src={schedule.image} alt="Equipment" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <Icon name="camera" className="w-4 h-4 text-gray-400 mx-auto" />
                <span className="text-[10px] text-gray-400">Photo</span>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1">
                <span className={catColor}><Icon name={catIcon} className="w-4 h-4" /></span>
                <span className="text-xs text-gray-500">{schedule.application}</span>
              </div>
              <p className="font-bold text-gray-900 text-sm">{schedule.brand} {schedule.model}</p>
            </div>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusBadge[status]}`}>
              {status === 'overdue' ? 'OVERDUE' : status === 'due_soon' ? 'DUE' : 'OK'}
            </span>
          </div>
          
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
            <span>Last: {formatDateShort(schedule.lastServiceDate)}</span>
            <span>Next: {formatDateShort(schedule.nextDueDate)}</span>
            <span className={daysUntil < 0 ? 'text-red-600 font-medium' : ''}>
              ({daysUntil < 0 ? `${Math.abs(daysUntil)}d over` : `${daysUntil}d`})
            </span>
          </div>

          {schedule.lastServicedBy && (
            <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
              <Icon name="user" className="w-3 h-3" />
              <span>Last by: <span className="text-gray-700">{schedule.lastServicedBy}</span></span>
            </div>
          )}

          <div className="mt-2 flex gap-1">
            <button onClick={() => onEdit(schedule)} className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100">Edit</button>
            <button onClick={() => onRecord(schedule)} className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100">Service</button>
            <button onClick={() => onDelete(schedule.id)} className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">Remove</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add Equipment Form
function AddEquipmentForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ category: '', application: '', brand: '', model: '' });
  
  const categoryKey = form.category?.toLowerCase() || 'other';
  const brandOptions = BRANDS[categoryKey] || BRANDS.other;
  const modelOptions = MODELS[categoryKey] || MODELS.other;

  const handleAdd = () => {
    if (!form.category || !form.application || !form.brand || !form.model) {
      alert('Please fill in all fields');
      return;
    }
    onAdd(form);
  };

  return (
    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <h4 className="font-medium text-sm mb-3">Add New Equipment</h4>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <CustomSelect label="Type *" value={form.category} onChange={v => setForm({ ...form, category: v, brand: '', model: '' })} options={EQUIPMENT_TYPES} placeholder="Select type..." />
        <CustomSelect label="Application *" value={form.application} onChange={v => setForm({ ...form, application: v })} options={APPLICATIONS} placeholder="Select..." />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <CustomSelect label="Brand *" value={form.brand} onChange={v => setForm({ ...form, brand: v })} options={brandOptions} placeholder="Select brand..." />
        <CustomSelect label="Model *" value={form.model} onChange={v => setForm({ ...form, model: v })} options={modelOptions} placeholder="Select model..." />
      </div>
      <div className="flex gap-2">
        <button onClick={handleAdd} className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Add Equipment</button>
        <button onClick={onCancel} className="flex-1 px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
      </div>
    </div>
  );
}

// Log Entry
function LogEntry({ log, technicians }) {
  const tech = technicians.find(t => t.id === log.technicianId);
  const typeColors = {
    service: 'border-green-400 bg-green-50',
    equipment_added: 'border-blue-400 bg-blue-50',
    equipment_removed: 'border-red-400 bg-red-50',
    property_updated: 'border-purple-400 bg-purple-50',
    note: 'border-gray-400 bg-gray-50'
  };
  const typeIcons = { service: 'check', equipment_added: 'plus', equipment_removed: 'trash', property_updated: 'edit', note: 'clipboard' };

  return (
    <div className={`border-l-4 ${typeColors[log.type] || 'border-gray-400 bg-gray-50'} p-3 rounded-r-lg mb-2`}>
      <div className="flex items-start gap-2">
        <Icon name={typeIcons[log.type] || 'clipboard'} className="w-4 h-4 text-gray-500 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{log.title}</p>
          {log.description && <p className="text-xs text-gray-600 mt-0.5">{log.description}</p>}
          {log.equipment && <p className="text-xs text-gray-500 mt-0.5">Equipment: {log.equipment}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Icon name="clock" className="w-3 h-3" />
          {formatDateTime(log.timestamp)}
        </span>
        {(tech || log.technicianName) && (
          <span className="flex items-center gap-1">
            <Icon name="user" className="w-3 h-3" />
            {tech?.name || log.technicianName}
          </span>
        )}
      </div>
    </div>
  );
}

// Property Sidebar
function PropertySidebar({ property, schedules, logs, supervisors, technicians, onClose, onUpdateProperty, onAddEquipment, onEditEquipment, onDeleteEquipment, onImageUpload, onRecordService, propertyCounty, onUpdateCounty, onAddLog }) {
  const [activeTab, setActiveTab] = useState('equipment');
  const [propertyForm, setPropertyForm] = useState({ ...property });
  const [addingEquipment, setAddingEquipment] = useState(false);
  const [newNote, setNewNote] = useState('');

  const heaters = schedules.filter(s => s.equipmentCategory === 'heater');
  const filters = schedules.filter(s => s.equipmentCategory === 'filter');
  const pumps = schedules.filter(s => s.equipmentCategory === 'pump');
  const otherEquip = schedules.filter(s => !['heater', 'filter', 'pump'].includes(s.equipmentCategory));
  
  const propertySupervisor = supervisors.find(s => s.id === property.supervisorId);
  const propertyLogs = logs.filter(l => l.propertyId === property.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const handleAddEquipment = (equipForm) => {
    onAddEquipment(property.id, equipForm);
    setAddingEquipment(false);
  };

  const savePropertySettings = () => {
    onUpdateProperty(propertyForm);
    alert('Property settings saved!');
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    onAddLog({ propertyId: property.id, type: 'note', title: 'Note Added', description: newNote, timestamp: new Date().toISOString() });
    setNewNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      
      <div className="w-full max-w-md bg-white shadow-xl flex flex-col h-full animate-slide-in">
        <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate">{property.customerName}</h2>
              <div className="flex items-center gap-2 text-blue-100 text-sm flex-wrap">
                <span>{schedules.length} Equipment</span>
                {propertySupervisor && <span>• 👷 {propertySupervisor.name}</span>}
                <span className="px-2 py-0.5 rounded bg-white/20 text-xs">
                  {propertyCounty === 'north' ? '🔵 North' : propertyCounty === 'south' ? '🟢 South' : '⚪ Unassigned'}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><Icon name="x" className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex border-b bg-gray-50">
          {['equipment', 'logs', 'settings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-3 py-2 text-sm font-medium ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500'}`}>
              {tab === 'equipment' ? '🔧 Equipment' : tab === 'logs' ? '📋 Logs' : '⚙️ Settings'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'equipment' && (
            <div className="p-4">
              <button onClick={() => setAddingEquipment(true)} className="w-full mb-4 p-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2">
                <Icon name="plus" className="w-5 h-5" />
                <span className="font-medium">Add New Equipment</span>
              </button>

              {addingEquipment && <AddEquipmentForm onAdd={handleAddEquipment} onCancel={() => setAddingEquipment(false)} />}

              {heaters.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-orange-600 mb-2 flex items-center gap-1">
                    <Icon name="flame" className="w-4 h-4" /> Heaters ({heaters.length})
                  </h4>
                  {heaters.map(s => <SidebarEquipmentCard key={s.id} schedule={s} onEdit={onEditEquipment} onDelete={onDeleteEquipment} onImageUpload={onImageUpload} onRecord={onRecordService} />)}
                </div>
              )}

              {filters.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-1">
                    <Icon name="filter" className="w-4 h-4" /> Filters ({filters.length})
                  </h4>
                  {filters.map(s => <SidebarEquipmentCard key={s.id} schedule={s} onEdit={onEditEquipment} onDelete={onDeleteEquipment} onImageUpload={onImageUpload} onRecord={onRecordService} />)}
                </div>
              )}

              {pumps.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
                    <Icon name="cog" className="w-4 h-4" /> Pumps ({pumps.length})
                  </h4>
                  {pumps.map(s => <SidebarEquipmentCard key={s.id} schedule={s} onEdit={onEditEquipment} onDelete={onDeleteEquipment} onImageUpload={onImageUpload} onRecord={onRecordService} />)}
                </div>
              )}

              {otherEquip.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-purple-600 mb-2">Other ({otherEquip.length})</h4>
                  {otherEquip.map(s => <SidebarEquipmentCard key={s.id} schedule={s} onEdit={onEditEquipment} onDelete={onDeleteEquipment} onImageUpload={onImageUpload} onRecord={onRecordService} />)}
                </div>
              )}

              {schedules.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Icon name="cog" className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No equipment added yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="p-4">
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                <h4 className="text-sm font-medium mb-2">Add Note</h4>
                <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={2} placeholder="Enter a note..." className="w-full px-3 py-2 text-sm border rounded-lg mb-2" />
                <button onClick={addNote} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Add Note</button>
              </div>

              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
                <Icon name="clipboard" className="w-4 h-4" /> Activity Log ({propertyLogs.length})
              </h4>
              
              {propertyLogs.length > 0 ? (
                propertyLogs.map(log => <LogEntry key={log.id} log={log} technicians={technicians} />)
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Icon name="clipboard" className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No activity logged yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
                <input type="text" value={propertyForm.customerName} onChange={e => setPropertyForm({ ...propertyForm, customerName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" value={propertyForm.address || ''} onChange={e => setPropertyForm({ ...propertyForm, address: e.target.value })} placeholder="Enter property address" className="w-full px-3 py-2 border rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Supervisor</label>
                <select value={propertyForm.supervisorId || ''} onChange={e => setPropertyForm({ ...propertyForm, supervisorId: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Not Assigned</option>
                  {supervisors.map(s => <option key={s.id} value={s.id}>{s.name} - {s.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region / County</label>
                <select value={propertyCounty} onChange={e => onUpdateCounty(property.id, e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="north">🔵 North County</option>
                  <option value="south">🟢 South County</option>
                  <option value="unassigned">⚪ Unassigned</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pool Types</label>
                <input type="text" value={propertyForm.poolTypes || ''} onChange={e => setPropertyForm({ ...propertyForm, poolTypes: e.target.value })} placeholder="Pool, Spa, Wader" className="w-full px-3 py-2 border rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={propertyForm.notes || ''} onChange={e => setPropertyForm({ ...propertyForm, notes: e.target.value })} rows={3} placeholder="Notes..." className="w-full px-3 py-2 border rounded-lg" />
              </div>

              <button onClick={savePropertySettings} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Save Settings
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}

// Record Service Modal
function RecordModal({ schedule, supervisors, technicians, onClose, onSubmit }) {
  const [form, setForm] = useState({ serviceDate: new Date().toISOString().split('T')[0], serviceReason: '', technicianId: '', conditionRating: 'good', earlyApprovedBy: '', earlyNotes: '', workNotes: '' });
  const daysSince = getDaysSince(schedule.lastServiceDate);
  const minDays = (schedule.intervalMonths - 2) * 30;
  const isEarly = daysSince < minDays;

  const submit = () => {
    if (!form.serviceReason) return alert('Select a service reason');
    if (!form.technicianId) return alert('Select the technician');
    if (isEarly && !form.earlyApprovedBy) return alert('Early service requires supervisor approval');
    const tech = technicians.find(t => t.id === parseInt(form.technicianId));
    onSubmit(schedule, { ...form, technicianName: tech?.name, wasEarlyService: isEarly });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="font-semibold">{isEarly ? '⚠️ Early Service' : '✓ Record Service'}</h2>
            <p className="text-xs text-gray-500">{schedule.customerName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Icon name="x" className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className={`rounded p-2 ${isEarly ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
            <p className="font-bold text-sm">{schedule.brand} {schedule.model}</p>
            <p className="text-xs mt-0.5">{isEarly ? `⚠️ Only ${daysSince} days since last` : `✅ ${daysSince} days since last`}</p>
          </div>
          
          <div>
            <label className="block text-xs font-medium mb-1">Service Date *</label>
            <input type="date" value={form.serviceDate} onChange={e => setForm({ ...form, serviceDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          
          <div>
            <label className="block text-xs font-medium mb-1">Technician *</label>
            <select value={form.technicianId} onChange={e => setForm({ ...form, technicianId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
              <option value="">Select technician...</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium mb-1">Service Reason *</label>
            <select value={form.serviceReason} onChange={e => setForm({ ...form, serviceReason: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
              <option value="">Select...</option>
              {SERVICE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          
          {isEarly && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1">Approved By (Supervisor) *</label>
                <select value={form.earlyApprovedBy} onChange={e => setForm({ ...form, earlyApprovedBy: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Select...</option>
                  {supervisors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Reason for Early *</label>
                <textarea value={form.earlyNotes} onChange={e => setForm({ ...form, earlyNotes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-xs font-medium mb-1">Work Notes (optional)</label>
            <textarea value={form.workNotes} onChange={e => setForm({ ...form, workNotes: e.target.value })} rows={2} placeholder="Details about work..." className="w-full px-3 py-2 border rounded-lg" />
          </div>
          
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-3 py-2 border rounded-lg">Cancel</button>
            <button onClick={submit} className={`flex-1 px-3 py-2 rounded-lg text-white ${isEarly ? 'bg-orange-600' : 'bg-green-600'}`}>{isEarly ? '⚠️ Record' : '✓ Record'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Edit Equipment Modal
function EditEquipmentModal({ schedule, technicians, onClose, onSave }) {
  const [form, setForm] = useState({ ...schedule });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Edit Equipment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Icon name="x" className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-gray-50 rounded p-2">
            <p className="font-bold">{form.brand} {form.model}</p>
            <p className="text-xs text-gray-500">{form.application} {form.equipmentCategory}</p>
          </div>
          
          <div>
            <label className="block text-xs font-medium mb-1">Last Service Date</label>
            <input type="date" value={form.lastServiceDate} onChange={e => setForm({ ...form, lastServiceDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          
          <div>
            <label className="block text-xs font-medium mb-1">Next Due Date</label>
            <input type="date" value={form.nextDueDate} onChange={e => setForm({ ...form, nextDueDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          
          <div>
            <label className="block text-xs font-medium mb-1">Interval (months)</label>
            <input type="number" value={form.intervalMonths} onChange={e => setForm({ ...form, intervalMonths: parseInt(e.target.value) || 12 })} min="1" max="24" className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Last Serviced By</label>
            <select value={form.lastServicedById || ''} onChange={e => { const t = technicians.find(x => x.id === parseInt(e.target.value)); setForm({ ...form, lastServicedById: t?.id || null, lastServicedBy: t?.name || '' }); }} className="w-full px-3 py-2 border rounded-lg">
              <option value="">Select...</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Equipment Notes</label>
            <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-3 py-2 border rounded-lg">Cancel</button>
            <button onClick={() => { onSave(form); onClose(); }} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main App
export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [properties, setProperties] = useState(ALL_PROPERTIES);
  const [propertyCounties, setPropertyCounties] = useState(() => {
    const c = {}; ALL_PROPERTIES.forEach(p => { c[p.id] = getCounty(p.customerName); }); return c;
  });
  const [supervisors] = useState(DEFAULT_SUPERVISORS);
  const [technicians] = useState(DEFAULT_TECHNICIANS);
  const initialSchedules = useMemo(() => generateAllData(ALL_PROPERTIES, DEFAULT_TECHNICIANS), []);
  const [pmSchedules, setPmSchedules] = useState(initialSchedules);
  const [intervals, setIntervals] = useState(DEFAULT_INTERVALS);
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [countyFilter, setCountyFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grouped'
  
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [recordingSchedule, setRecordingSchedule] = useState(null);

  const stats = useMemo(() => {
    const active = pmSchedules.filter(s => s.isActive);
    return {
      overdue: active.filter(s => getStatus(s.nextDueDate) === 'overdue').length,
      dueSoon: active.filter(s => getStatus(s.nextDueDate) === 'due_soon').length,
      current: active.filter(s => getStatus(s.nextDueDate) === 'current').length,
      total: active.length,
    };
  }, [pmSchedules]);

  const getPropertyStats = (propId) => {
    const scheds = pmSchedules.filter(s => s.propertyId === propId && s.isActive);
    return { overdue: scheds.filter(s => getStatus(s.nextDueDate) === 'overdue').length, dueSoon: scheds.filter(s => getStatus(s.nextDueDate) === 'due_soon').length };
  };

  const filteredProps = useMemo(() => {
    let result = [...properties];
    if (search) result = result.filter(p => p.customerName.toLowerCase().includes(search.toLowerCase()));
    if (countyFilter !== 'all') result = result.filter(p => propertyCounties[p.id] === countyFilter);
    if (filter === 'overdue') result = result.filter(p => getPropertyStats(p.id).overdue > 0);
    if (filter === 'due_soon') result = result.filter(p => getPropertyStats(p.id).dueSoon > 0);
    result.sort((a, b) => getPropertyStats(b.id).overdue - getPropertyStats(a.id).overdue);
    return result;
  }, [properties, pmSchedules, search, filter, countyFilter, propertyCounties]);

  const addLog = (logData) => {
    setLogs([...logs, { id: Date.now(), timestamp: new Date().toISOString(), ...logData }]);
  };

  const handleUpdateProperty = (updated) => {
    setProperties(properties.map(p => p.id === updated.id ? updated : p));
    if (selectedProperty?.id === updated.id) setSelectedProperty(updated);
    addLog({ propertyId: updated.id, type: 'property_updated', title: 'Property Settings Updated', description: 'Property information was modified' });
  };

  const handleSupervisorChange = (propId, supervisorId) => {
    setProperties(properties.map(p => p.id === propId ? { ...p, supervisorId } : p));
    if (selectedProperty?.id === propId) setSelectedProperty({ ...selectedProperty, supervisorId });
  };

  const handleCountyChange = (propId, county) => {
    setPropertyCounties({ ...propertyCounties, [propId]: county });
  };

  const handleAddEquipment = (propertyId, equipForm) => {
    const newId = Math.max(...pmSchedules.map(s => s.id), 0) + 1;
    const prop = properties.find(p => p.id === propertyId);
    const category = equipForm.category.toLowerCase();
    const serviceType = category === 'heater' ? 'Heater De-soot' : category === 'filter' ? 'Filter Recharge' : category === 'pump' ? 'Pump Inspection' : 'General Maintenance';
    const intervalMonths = equipForm.application === 'Spa' ? 6 : 12;
    const today = new Date().toISOString().split('T')[0];
    
    const newSchedule = {
      id: newId, propertyId, customerName: prop.customerName,
      equipmentCategory: category, application: equipForm.application,
      brand: equipForm.brand, model: equipForm.model, serviceType, intervalMonths,
      lastServiceDate: today, nextDueDate: addMonths(today, intervalMonths),
      isActive: true, image: null, notes: '', lastServicedBy: '', lastServicedById: null
    };
    setPmSchedules([...pmSchedules, newSchedule]);
    addLog({ propertyId, type: 'equipment_added', title: 'Equipment Added', equipment: `${equipForm.brand} ${equipForm.model}`, description: `${equipForm.application} ${equipForm.category}` });
  };

  const handleDeleteEquipment = (scheduleId) => {
    if (!confirm('Remove this equipment?')) return;
    const schedule = pmSchedules.find(s => s.id === scheduleId);
    setPmSchedules(pmSchedules.filter(s => s.id !== scheduleId));
    addLog({ propertyId: schedule.propertyId, type: 'equipment_removed', title: 'Equipment Removed', equipment: `${schedule.brand} ${schedule.model}` });
  };

  const handleImageUpload = (scheduleId, imageData) => {
    setPmSchedules(pmSchedules.map(s => s.id === scheduleId ? { ...s, image: imageData } : s));
  };

  const handleSaveEquipment = (updated) => {
    setPmSchedules(pmSchedules.map(s => s.id === updated.id ? updated : s));
  };

  const handleRecordService = (schedule, record) => {
    const interval = intervals.find(i => i.serviceType === schedule.serviceType && (i.waterType === schedule.application || i.waterType === 'All'));
    const months = interval?.recommendedMonths || 12;
    setPmSchedules(pmSchedules.map(s => s.id === schedule.id ? { ...s, lastServiceDate: record.serviceDate, nextDueDate: addMonths(record.serviceDate, months), lastServicedBy: record.technicianName, lastServicedById: parseInt(record.technicianId) } : s));
    addLog({ propertyId: schedule.propertyId, type: 'service', title: `${schedule.serviceType} Completed`, equipment: `${schedule.brand} ${schedule.model}`, description: record.workNotes || record.serviceReason, technicianId: parseInt(record.technicianId), technicianName: record.technicianName });
    setRecordingSchedule(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="px-4 flex justify-between items-center h-12">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">B</div>
            <span className="font-bold">PM Tracker</span>
          </div>
          <nav className="flex gap-1">
            {['dashboard', 'intervals', 'team'].map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded text-sm ${tab === t ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}>
                {t === 'dashboard' ? '📊' : t === 'intervals' ? '⏱️' : '👥'} {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {tab === 'dashboard' && (
        <main className="p-4 max-w-5xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')} className={`p-3 rounded-xl cursor-pointer ${filter === 'overdue' ? 'ring-2 ring-blue-500' : ''} bg-red-50 border border-red-200`}>
              <p className="text-xs text-red-600">Overdue</p>
              <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
            </div>
            <div onClick={() => setFilter(filter === 'due_soon' ? 'all' : 'due_soon')} className={`p-3 rounded-xl cursor-pointer ${filter === 'due_soon' ? 'ring-2 ring-blue-500' : ''} bg-orange-50 border border-orange-200`}>
              <p className="text-xs text-orange-600">Due Soon</p>
              <p className="text-2xl font-bold text-orange-700">{stats.dueSoon}</p>
            </div>
            <div className="p-3 rounded-xl bg-green-50 border border-green-200">
              <p className="text-xs text-green-600">Current</p>
              <p className="text-2xl font-bold text-green-700">{stats.current}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-xs text-blue-600">Properties</p>
              <p className="text-2xl font-bold text-blue-700">{filteredProps.length}</p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-xl border p-3 mb-4 flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search properties..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg" />
            </div>
            <select value={countyFilter} onChange={e => setCountyFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="all">All Regions</option>
              <option value="north">🔵 North County</option>
              <option value="south">🟢 South County</option>
              <option value="unassigned">⚪ Unassigned</option>
            </select>
            <div className="flex gap-1">
              {['all', 'overdue', 'due_soon'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-sm ${filter === f ? (f === 'overdue' ? 'bg-red-600 text-white' : f === 'due_soon' ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white') : 'bg-gray-100'}`}>
                  {f === 'all' ? 'All' : f === 'overdue' ? 'Overdue' : 'Due Soon'}
                </button>
              ))}
            </div>
          </div>

          {/* Property List with Inline Assignments */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
              <h2 className="font-semibold text-sm text-gray-700">Properties ({filteredProps.length})</h2>
              <p className="text-xs text-gray-500">Click row to view details • Assign region & supervisor inline</p>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {filteredProps.map(prop => {
                const sup = supervisors.find(s => s.id === prop.supervisorId);
                return (
                  <PropertyRow
                    key={prop.id}
                    property={prop}
                    stats={getPropertyStats(prop.id)}
                    county={propertyCounties[prop.id]}
                    supervisor={sup}
                    supervisors={supervisors}
                    onCountyChange={handleCountyChange}
                    onSupervisorChange={handleSupervisorChange}
                    onPropertyClick={setSelectedProperty}
                  />
                );
              })}
              {filteredProps.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <Icon name="search" className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No properties found</p>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {tab === 'intervals' && (
        <main className="p-4 max-w-2xl mx-auto">
          <h1 className="text-xl font-bold mb-4">⏱️ Service Intervals</h1>
          <div className="space-y-3">
            {intervals.map(int => (
              <div key={int.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={int.category === 'heater' ? 'text-orange-500' : int.category === 'filter' ? 'text-blue-500' : 'text-gray-500'}>
                    <Icon name={int.category === 'heater' ? 'flame' : int.category === 'filter' ? 'filter' : 'cog'} className="w-5 h-5" />
                  </span>
                  <span className="font-semibold">{int.serviceType}</span>
                  <span className="text-sm text-gray-500">({int.waterType})</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Recommended (months)</label>
                    <input type="number" value={int.recommendedMonths} onChange={e => setIntervals(intervals.map(i => i.id === int.id ? { ...i, recommendedMonths: parseInt(e.target.value) || 12 } : i))} min="1" max="24" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Minimum (months)</label>
                    <input type="number" value={int.minimumMonths} onChange={e => setIntervals(intervals.map(i => i.id === int.id ? { ...i, minimumMonths: parseInt(e.target.value) || 6 } : i))} min="1" max="24" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {tab === 'team' && (
        <main className="p-4 max-w-2xl mx-auto">
          <h1 className="text-xl font-bold mb-4">👥 Team</h1>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Icon name="users" className="w-5 h-5" /> Supervisors</h2>
            <div className="space-y-2">
              {supervisors.map(s => (
                <div key={s.id} className="bg-white rounded-lg border p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-gray-500">{s.title} • {s.phone}</p>
                  </div>
                  <div className="flex gap-1">
                    {s.counties.includes('north') && <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">North</span>}
                    {s.counties.includes('south') && <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">South</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Icon name="user" className="w-5 h-5" /> Technicians</h2>
            <div className="grid grid-cols-2 gap-2">
              {technicians.map(t => (
                <div key={t.id} className="bg-white rounded-lg border p-3">
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.phone}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {selectedProperty && (
        <PropertySidebar
          property={selectedProperty}
          schedules={pmSchedules.filter(s => s.propertyId === selectedProperty.id && s.isActive)}
          logs={logs}
          supervisors={supervisors}
          technicians={technicians}
          onClose={() => setSelectedProperty(null)}
          onUpdateProperty={handleUpdateProperty}
          onAddEquipment={handleAddEquipment}
          onEditEquipment={setEditingSchedule}
          onDeleteEquipment={handleDeleteEquipment}
          onImageUpload={handleImageUpload}
          onRecordService={setRecordingSchedule}
          propertyCounty={propertyCounties[selectedProperty.id]}
          onUpdateCounty={handleCountyChange}
          onAddLog={addLog}
        />
      )}

      {editingSchedule && <EditEquipmentModal schedule={editingSchedule} technicians={technicians} onClose={() => setEditingSchedule(null)} onSave={handleSaveEquipment} />}
      {recordingSchedule && <RecordModal schedule={recordingSchedule} supervisors={supervisors} technicians={technicians} onClose={() => setRecordingSchedule(null)} onSubmit={handleRecordService} />}
    </div>
  );
}
