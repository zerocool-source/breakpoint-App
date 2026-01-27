import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: ReturnType<typeof Twilio> | null = null;

function getClient() {
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
  }
  if (!twilioClient) {
    twilioClient = Twilio(accountSid, authToken);
  }
  return twilioClient;
}

export interface SendSmsParams {
  to: string;
  body: string;
  from?: string;
}

export interface SmsResult {
  success: boolean;
  sid?: string;
  status?: string;
  error?: string;
}

export async function sendSms(params: SendSmsParams): Promise<SmsResult> {
  try {
    const client = getClient();
    const fromNumber = params.from || twilioPhoneNumber;
    
    if (!fromNumber) {
      throw new Error("No 'from' phone number specified. Please set TWILIO_PHONE_NUMBER or provide a 'from' number.");
    }

    const message = await client.messages.create({
      body: params.body,
      to: params.to,
      from: fromNumber,
    });

    return {
      success: true,
      sid: message.sid,
      status: message.status,
    };
  } catch (error: any) {
    console.error("SMS send error:", error);
    return {
      success: false,
      error: error.message || "Failed to send SMS",
    };
  }
}

export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && twilioPhoneNumber);
}
