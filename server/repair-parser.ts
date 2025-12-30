// Repair Parser - Extracts parts, labor, and prices from office notes
// Format example:
// Invoice 54253
// Air Relief Assembly TR Series
// part #PEN273564Z, PAC-051-0319	
// 1
// $148.64
// Labor
// 0.5
// $150.00

export interface RepairLineItem {
  type: 'part' | 'labor';
  description: string;
  partNumber?: string;
  quantity: number;
  price: number;
}

export interface ParsedRepair {
  invoiceNumber?: string;
  items: RepairLineItem[];
  totalParts: number;
  totalLabor: number;
  totalPrice: number;
}

export function parseOfficeNotesForRepairs(officeNotes: string): ParsedRepair | null {
  if (!officeNotes || officeNotes.trim().length === 0) {
    return null;
  }

  const result: ParsedRepair = {
    items: [],
    totalParts: 0,
    totalLabor: 0,
    totalPrice: 0
  };

  // Split into lines and clean up
  const lines = officeNotes
    .split(/[\n\r]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Extract invoice number if present
  const invoiceMatch = officeNotes.match(/Invoice\s*#?\s*(\d+)/i);
  if (invoiceMatch) {
    result.invoiceNumber = invoiceMatch[1];
  }

  // Parse line by line looking for patterns
  let currentItem: Partial<RepairLineItem> | null = null;
  let pendingDescription = '';
  let pendingPartNumber = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';
    const prevLine = lines[i - 1] || '';

    // Skip invoice line
    if (/^Invoice\s*#?\s*\d+/i.test(line)) {
      continue;
    }

    // Skip "Instructions:" header
    if (/^Instructions:/i.test(line)) {
      continue;
    }

    // Check if this is a "Labor" line
    if (/^Labor$/i.test(line)) {
      // Save any pending part
      if (currentItem && currentItem.type === 'part' && currentItem.price) {
        result.items.push(currentItem as RepairLineItem);
        result.totalParts += currentItem.price;
      }
      
      // Start new labor item
      currentItem = {
        type: 'labor',
        description: 'Labor',
        quantity: 1,
        price: 0
      };
      continue;
    }

    // Check for price pattern: $xxx.xx or just xxx.xx at end
    const priceMatch = line.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*\.?\s*$/);
    if (priceMatch && currentItem) {
      const price = parseFloat(priceMatch[1].replace(',', ''));
      if (!isNaN(price) && price > 0) {
        currentItem.price = price;
        
        // If this is a labor item, add it
        if (currentItem.type === 'labor') {
          result.items.push(currentItem as RepairLineItem);
          result.totalLabor += price;
          currentItem = null;
        }
        continue;
      }
    }

    // Check for standalone quantity (just a number like "1" or "0.5")
    const qtyMatch = line.match(/^(\d+(?:\.\d+)?)$/);
    if (qtyMatch && currentItem) {
      currentItem.quantity = parseFloat(qtyMatch[1]);
      continue;
    }

    // Check for part number pattern
    const partMatch = line.match(/part\s*#?\s*([A-Z0-9\-,\s]+)/i);
    if (partMatch) {
      pendingPartNumber = partMatch[1].trim();
      if (currentItem) {
        currentItem.partNumber = pendingPartNumber;
      }
      continue;
    }

    // Check if this looks like a product description (not a price, not a qty, not special)
    if (line.length > 3 && !priceMatch && !qtyMatch && !/^(Invoice|Labor|Instructions)/i.test(line)) {
      // Save any complete pending item
      if (currentItem && currentItem.type === 'part' && currentItem.price) {
        result.items.push(currentItem as RepairLineItem);
        result.totalParts += currentItem.price;
      }
      
      // Start new part item
      currentItem = {
        type: 'part',
        description: line,
        quantity: 1,
        price: 0
      };
      continue;
    }
  }

  // Don't forget last item
  if (currentItem && currentItem.price) {
    result.items.push(currentItem as RepairLineItem);
    if (currentItem.type === 'part') {
      result.totalParts += currentItem.price;
    } else {
      result.totalLabor += currentItem.price;
    }
  }

  // Calculate total
  result.totalPrice = result.totalParts + result.totalLabor;

  // Only return if we found something meaningful
  if (result.items.length === 0 && !result.invoiceNumber) {
    return null;
  }

  return result;
}

// Alternative simpler regex-based approach for extracting prices
export function extractPricesFromNotes(officeNotes: string): { prices: number[], total: number, hasLabor: boolean } {
  if (!officeNotes) {
    return { prices: [], total: 0, hasLabor: false };
  }

  const prices: number[] = [];
  
  // Find all price patterns
  const priceRegex = /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
  let match;
  
  while ((match = priceRegex.exec(officeNotes)) !== null) {
    const price = parseFloat(match[1].replace(',', ''));
    if (!isNaN(price) && price > 0) {
      prices.push(price);
    }
  }

  const hasLabor = /labor/i.test(officeNotes);
  const total = prices.reduce((sum, p) => sum + p, 0);

  return { prices, total, hasLabor };
}
