import { ConfidentialClientApplication } from "@azure/msal-node";

interface OutlookDraftConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  userEmail: string;
}

interface EmailDraft {
  to: string;
  cc?: string;
  subject: string;
  body: string;
}

export class OutlookGraphClient {
  private msalClient: ConfidentialClientApplication | null = null;
  private config: OutlookDraftConfig;

  constructor(config: OutlookDraftConfig) {
    this.config = config;
    
    if (config.clientId && config.clientSecret && config.tenantId) {
      this.msalClient = new ConfidentialClientApplication({
        auth: {
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          authority: `https://login.microsoftonline.com/${config.tenantId}`,
        },
      });
    }
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.msalClient) return null;
    
    try {
      const result = await this.msalClient.acquireTokenByClientCredential({
        scopes: ["https://graph.microsoft.com/.default"],
      });
      return result?.accessToken || null;
    } catch (error) {
      console.error("Failed to get access token:", error);
      return null;
    }
  }

  async createDraft(draft: EmailDraft): Promise<{ draftId: string; webLink: string } | null> {
    const token = await this.getAccessToken();
    if (!token) {
      console.error("No access token available");
      return null;
    }

    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/users/${this.config.userEmail}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject: draft.subject,
            body: {
              contentType: "Text",
              content: draft.body,
            },
            toRecipients: [
              {
                emailAddress: {
                  address: draft.to,
                },
              },
            ],
            ccRecipients: draft.cc
              ? [
                  {
                    emailAddress: {
                      address: draft.cc,
                    },
                  },
                ]
              : [],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Graph API error:", response.status, errorText);
        return null;
      }

      const message = await response.json();
      
      return {
        draftId: message.id,
        webLink: message.webLink || `https://outlook.office.com/mail/drafts`,
      };
    } catch (error) {
      console.error("Failed to create draft:", error);
      return null;
    }
  }
}
