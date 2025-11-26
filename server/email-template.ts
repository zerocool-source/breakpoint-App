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
  const bodyLines: string[] = [];

  orders.forEach(order => {
    const rushFlag = order.rush ? " RUSH" : "";
    bodyLines.push(`${order.accountName}${rushFlag}`);
    if (order.address) bodyLines.push(order.address);
    if (order.entryNotes) bodyLines.push(order.entryNotes);
    (order.items || []).forEach(item => bodyLines.push(item));
    bodyLines.push(""); // blank line between accounts
  });

  bodyLines.push("David Harding Sr | 951-312-5060");

  return bodyLines.join("\n");
}
