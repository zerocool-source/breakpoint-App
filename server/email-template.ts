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

interface ChunkedEmailResult {
  emails: {
    subject: string;
    body: string;
    orderCount: number;
    partNumber: number;
    totalParts: number;
  }[];
  totalOrders: number;
}

const MAX_PROPERTIES_PER_EMAIL = 10;

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
    bodyLines.push("");
  });

  bodyLines.push("David Harding Sr | 951-312-5060");

  return bodyLines.join("\n");
}

export function buildChunkedChemicalEmails({
  orders,
  vendorName,
  vendorEmail,
  repName,
  repEmail,
  subject
}: EmailParams): ChunkedEmailResult {
  if (orders.length === 0) {
    return { emails: [], totalOrders: 0 };
  }

  if (orders.length <= MAX_PROPERTIES_PER_EMAIL) {
    const body = buildChemicalOrderEmail({ orders, vendorName, vendorEmail, repName, repEmail, subject });
    return {
      emails: [{
        subject,
        body,
        orderCount: orders.length,
        partNumber: 1,
        totalParts: 1
      }],
      totalOrders: orders.length
    };
  }

  const chunks: ChemicalOrder[][] = [];
  for (let i = 0; i < orders.length; i += MAX_PROPERTIES_PER_EMAIL) {
    chunks.push(orders.slice(i, i + MAX_PROPERTIES_PER_EMAIL));
  }

  const emails = chunks.map((chunk, index) => {
    const partNumber = index + 1;
    const totalParts = chunks.length;
    const partSubject = `${subject} (Part ${partNumber} of ${totalParts})`;
    
    const bodyLines: string[] = [];
    
    if (partNumber > 1) {
      bodyLines.push(`--- Continued from Part ${partNumber - 1} ---`);
      bodyLines.push("");
    }

    chunk.forEach(order => {
      const rushFlag = order.rush ? " RUSH" : "";
      bodyLines.push(`${order.accountName}${rushFlag}`);
      if (order.address) bodyLines.push(order.address);
      if (order.entryNotes) bodyLines.push(order.entryNotes);
      (order.items || []).forEach(item => bodyLines.push(item));
      bodyLines.push("");
    });

    if (partNumber < totalParts) {
      bodyLines.push(`--- Continued in Part ${partNumber + 1} ---`);
      bodyLines.push("");
    }

    bodyLines.push("David Harding Sr | 951-312-5060");

    return {
      subject: partSubject,
      body: bodyLines.join("\n"),
      orderCount: chunk.length,
      partNumber,
      totalParts
    };
  });

  return {
    emails,
    totalOrders: orders.length
  };
}
