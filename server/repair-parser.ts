// Repair Parser - Extracts parts, labor, and prices from office notes
// Format example:
// Invoice 54253
// Air Relief Assembly TR Series
// part #PEN273564Z, PAC-051-0319	
// 2
// $148.64
// Labor
// 0.5
// $150.00

export interface RepairLineItem {
  type: 'part' | 'labor';
  description: string;
  partNumber?: string;
  quantity: number;
  unitPrice: number;
  extendedPrice: number;
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

  // Split into lines and clean up - also split on tabs
  const lines = officeNotes
    .split(/[\n\r\t]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Extract invoice number if present
  const invoiceMatch = officeNotes.match(/Invoice\s*#?\s*(\d+)/i);
  if (invoiceMatch) {
    result.invoiceNumber = invoiceMatch[1];
  }

  // Parse line by line looking for patterns
  let currentItem: {
    type: 'part' | 'labor';
    description: string;
    partNumber?: string;
    quantity: number;
    unitPrice: number;
  } | null = null;

  const finalizeItem = () => {
    if (currentItem && currentItem.unitPrice > 0) {
      const extendedPrice = Math.round(currentItem.unitPrice * currentItem.quantity * 100) / 100;
      const item: RepairLineItem = {
        type: currentItem.type,
        description: currentItem.description,
        partNumber: currentItem.partNumber,
        quantity: currentItem.quantity,
        unitPrice: currentItem.unitPrice,
        extendedPrice: extendedPrice
      };
      result.items.push(item);
      
      if (currentItem.type === 'part') {
        result.totalParts += extendedPrice;
      } else {
        result.totalLabor += extendedPrice;
      }
    }
    currentItem = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip invoice line
    if (/^Invoice\s*#?\s*\d+/i.test(line)) {
      continue;
    }

    // Skip common header patterns and whitespace-only
    if (/^(Instructions:|NAME|QTY|PRICE|TAX)$/i.test(line) || line === '') {
      continue;
    }

    // Check if this is a "Labor" line
    if (/^Labor$/i.test(line)) {
      finalizeItem();
      currentItem = {
        type: 'labor',
        description: 'Labor',
        quantity: 1,
        unitPrice: 0
      };
      continue;
    }

    // Check for price pattern: $xxx.xx 
    const priceMatch = line.match(/^\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)$/);
    if (priceMatch && currentItem) {
      const price = parseFloat(priceMatch[1].replace(/,/g, ''));
      if (!isNaN(price) && price > 0) {
        currentItem.unitPrice = price;
        
        // If this is a labor item, finalize it immediately after getting price
        if (currentItem.type === 'labor') {
          finalizeItem();
        }
        continue;
      }
    }

    // Check for standalone quantity (just a number like "1" or "0.5" or "2")
    // This should come BEFORE the price in the sequence
    const qtyMatch = line.match(/^(\d+(?:\.\d+)?)$/);
    if (qtyMatch) {
      const qty = parseFloat(qtyMatch[1]);
      if (currentItem && qty > 0) {
        currentItem.quantity = qty;
      }
      continue;
    }

    // Check for part number pattern
    const partMatch = line.match(/^part\s*#?\s*([A-Z0-9\-_,\s]+)$/i);
    if (partMatch) {
      const partNumber = partMatch[1].trim();
      if (currentItem) {
        currentItem.partNumber = partNumber;
      }
      continue;
    }

    // Check if this looks like a product description (not a price, not a qty, not special)
    // Must be longer than 3 chars and not match special patterns
    if (line.length > 3 && 
        !priceMatch && 
        !qtyMatch && 
        !/^(Invoice|Labor|Instructions|NAME|QTY|PRICE|TAX|part\s*#)/i.test(line) &&
        !/^\$/.test(line)) {
      
      // Finalize any complete pending item before starting new one
      if (currentItem && currentItem.unitPrice > 0) {
        finalizeItem();
      } else if (currentItem && currentItem.type === 'part' && currentItem.unitPrice === 0) {
        // Previous item didn't get a price - discard it and start fresh
        currentItem = null;
      }
      
      // Start new part item
      currentItem = {
        type: 'part',
        description: line,
        quantity: 1,
        unitPrice: 0
      };
      continue;
    }
  }

  // Don't forget last item
  finalizeItem();

  // Round totals
  result.totalParts = Math.round(result.totalParts * 100) / 100;
  result.totalLabor = Math.round(result.totalLabor * 100) / 100;
  result.totalPrice = Math.round((result.totalParts + result.totalLabor) * 100) / 100;

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
    const price = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(price) && price > 0) {
      prices.push(price);
    }
  }

  const hasLabor = /labor/i.test(officeNotes);
  const total = prices.reduce((sum, p) => sum + p, 0);

  return { prices, total, hasLabor };
}
