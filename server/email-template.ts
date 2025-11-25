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
  // Outlook already shows From, To, Cc, Subject fields - no need to duplicate them in body
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

  return [...bodyLines, ...footerLines].join("\n");
}
