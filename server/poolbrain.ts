const POOLBRAIN_BASE_URL = "https://prodapi.poolbrain.com";

interface PoolBrainConfig {
  accessKey: string;
  companyId?: string;
}

function getConfig(): PoolBrainConfig {
  const accessKey = process.env.POOLBRAIN_ACCESS_KEY;
  const companyId = process.env.POOLBRAIN_COMPANY_ID;

  if (!accessKey) {
    throw new Error("POOLBRAIN_ACCESS_KEY environment variable is not set");
  }

  return { accessKey, companyId };
}

async function poolBrainRequest(endpoint: string, options: any = {}) {
  const config = getConfig();
  
  const headers: Record<string, string> = {
    "ACCESS-KEY": config.accessKey,
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (config.companyId) {
    headers["COMPANY-ID"] = config.companyId;
  }

  console.log(`[PoolBrain] Calling: ${POOLBRAIN_BASE_URL}${endpoint}`);
  
  const response = await fetch(`${POOLBRAIN_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  console.log(`[PoolBrain] Response status: ${response.status}, body length: ${text.length}`);
  
  if (!response.ok) {
    throw new Error(`Pool Brain API error: ${response.status} - ${text}`);
  }

  if (!text || text.trim() === '') {
    return { success: true, data: [] };
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.log(`[PoolBrain] Response body (first 500 chars): ${text.substring(0, 500)}`);
    throw new Error(`Failed to parse Pool Brain response: ${text.substring(0, 100)}`);
  }
}

export const poolBrainClient = {
  async getCustomers() {
    return poolBrainRequest("/v2/customer_list");
  },

  async getCustomerDetail(customerId: string) {
    return poolBrainRequest(`/v2/customer_detail?customerId=${customerId}`);
  },

  async getCustomerPools(customerId: string) {
    return poolBrainRequest(`/v2/customer_pool_details?customerId=${customerId}`);
  },

  async getProducts() {
    return poolBrainRequest("/v2/product_list");
  },

  async testConnection() {
    try {
      const result = await poolBrainRequest("/v2/customer_list");
      return { success: true, message: "Connected to Pool Brain API", data: result };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
};
