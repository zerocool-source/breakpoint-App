import { ConfidentialClientApplication } from "@azure/msal-node";

const SENDER_EMAIL = "business.development@breakpointpools.com";

interface EmailAttachment {
  name: string;
  contentType: string;
  contentBytes: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  attachments?: EmailAttachment[];
}

let msalClient: ConfidentialClientApplication | null = null;

function getMsalClient(): ConfidentialClientApplication {
  if (!msalClient) {
    const clientId = process.env.AZURE_CLIENT_ID;
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!clientId || !tenantId || !clientSecret) {
      throw new Error("Azure credentials not configured. Please set AZURE_CLIENT_ID, AZURE_TENANT_ID, and AZURE_CLIENT_SECRET.");
    }

    msalClient = new ConfidentialClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        clientSecret,
      },
    });
  }
  return msalClient;
}

async function getAccessToken(): Promise<string> {
  const client = getMsalClient();
  const tokenRequest = {
    scopes: ["https://graph.microsoft.com/.default"],
  };

  const response = await client.acquireTokenByClientCredential(tokenRequest);
  if (!response?.accessToken) {
    throw new Error("Failed to acquire access token from Azure AD");
  }
  return response.accessToken;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, htmlContent, attachments = [] } = options;

  const accessToken = await getAccessToken();

  const emailPayload = {
    message: {
      subject,
      body: {
        contentType: "HTML",
        content: htmlContent,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
      attachments: attachments.map((att) => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: att.name,
        contentType: att.contentType,
        contentBytes: att.contentBytes,
      })),
    },
    saveToSentItems: true,
  };

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Microsoft Graph API error:", errorText);
    throw new Error(`Failed to send email: ${response.status} - ${errorText}`);
  }
}
