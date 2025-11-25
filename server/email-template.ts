interface ChemicalOrder {
  accountName: string;
  rush: boolean;
  address: string;
  entryNotes?: string;
  items: string[];
}

interface EmailParams {
  orders: ChemicalOrder[];
  vendorName: string;
  vendorEmail: string;
  repName: string;
  repEmail: string;
  subject: string;
}

export function buildChemicalOrderEmail({
  orders,
  vendorName,
  vendorEmail,
  repName,
  repEmail,
  subject
}: EmailParams): string {
  const now = new Date();

  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const datePart = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
  const timePart = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });

  const headerLines = [
    `From: COO <COO@breakpointpools.com>`,
    `Sent: ${dayName}, ${datePart} ${timePart}`,
    `To: ${vendorName} <${vendorEmail}>`,
    `Cc: ${repName} <${repEmail}>`,
    `Subject: ${subject}`,
    "",
  ];

  const bodyLines: string[] = [];

  orders.forEach(order => {
    const rushFlag = order.rush ? " Rush!" : "";
    // Property name in HTML bold red for Outlook
    bodyLines.push(`<b><font color="#D32F2F">${order.accountName}${rushFlag}</font></b>`);
    if (order.address) bodyLines.push(order.address);
    
    // Clean lockbox info - remove bullets, plus signs, asterisks
    if (order.entryNotes) {
      const cleanedNotes = order.entryNotes
        .replace(/[•\+\*]/g, '')  // Remove bullets, plus signs, asterisks
        .replace(/^\s+/gm, '')    // Remove leading spaces from each line
        .trim();
      if (cleanedNotes) bodyLines.push(cleanedNotes);
    }
    
    bodyLines.push(""); // empty line before items

    // Clean chemical items - remove bullets, plus signs, extra whitespace
    (order.items || []).forEach(item => {
      const cleanedItem = item
        .replace(/[•\+\*]/g, '')      // Remove bullets, plus signs, asterisks
        .replace(/\n{2,}/g, '\n')     // Replace multiple newlines with single
        .replace(/^\s+/gm, '')        // Remove leading spaces from each line
        .trim();
      if (cleanedItem) bodyLines.push(cleanedItem);
    });
    bodyLines.push(""); // blank line between accounts
  });

  const footerLines = [
    "Warm Regards,",
    "",
    "David Harding Sr",
    "Chief Operating Officer",
    "Direct: 951-312-5060",
    "Office: 951-653-3333 Press 6",
    "https://www.breakpointpools.com"
  ];

  return [...headerLines, ...bodyLines, ...footerLines].join("\n");
}
