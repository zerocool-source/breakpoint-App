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
    bodyLines.push(`${order.accountName}${rushFlag}`);
    if (order.address) bodyLines.push(order.address);
    if (order.entryNotes) bodyLines.push(order.entryNotes);
    bodyLines.push(""); // empty line before items

    (order.items || []).forEach(item => bodyLines.push(item));
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
