// Pool Brain V2 API Client
// Based on the official API documentation

interface PoolBrainConfig {
  apiKey: string;
  companyId?: string;
  baseUrl?: string;
}

interface AlertsListParams {
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  offset?: number;
  limit?: number;
}

export class PoolBrainClient {
  private apiKey: string;
  private companyId?: string;
  private baseUrl: string;

  constructor(config: PoolBrainConfig) {
    this.apiKey = config.apiKey;
    this.companyId = config.companyId;
    this.baseUrl = config.baseUrl || "https://prodapi.poolbrain.com";
  }

  /**
   * Get alerts list from Pool Brain V2 API
   * Endpoint: GET /v2/alerts_list
   */
  async getAlertsList(params: AlertsListParams = {}) {
    const url = new URL(`${this.baseUrl}/v2/alerts_list`);

    // Add query parameters
    if (params.fromDate) url.searchParams.append("fromDate", params.fromDate);
    if (params.toDate) url.searchParams.append("toDate", params.toDate);
    if (params.offset) url.searchParams.append("offset", params.offset.toString());
    if (params.limit) url.searchParams.append("limit", params.limit.toString());

    const headers: Record<string, string> = {
      "ACCESS-KEY": this.apiKey,
      "Content-Type": "application/json",
    };

    // Add COMPANY-ID header if provided
    if (this.companyId) {
      headers["COMPANY-ID"] = this.companyId;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Pool Brain API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get customer list
   * Endpoint: GET /v2/customer_list
   */
  async getCustomerList(params: { offset?: number; limit?: number } = {}) {
    const url = new URL(`${this.baseUrl}/v2/customer_list`);

    if (params.offset) url.searchParams.append("offset", params.offset.toString());
    if (params.limit) url.searchParams.append("limit", params.limit.toString());

    const headers: Record<string, string> = {
      "ACCESS-KEY": this.apiKey,
      "Content-Type": "application/json",
    };

    if (this.companyId) {
      headers["COMPANY-ID"] = this.companyId;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Pool Brain API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get pools list
   * Endpoint: GET /v2/pools_list
   */
  async getPoolsList(params: { offset?: number; limit?: number } = {}) {
    const url = new URL(`${this.baseUrl}/v2/pools_list`);

    if (params.offset) url.searchParams.append("offset", params.offset.toString());
    if (params.limit) url.searchParams.append("limit", params.limit.toString());

    const headers: Record<string, string> = {
      "ACCESS-KEY": this.apiKey,
      "Content-Type": "application/json",
    };

    if (this.companyId) {
      headers["COMPANY-ID"] = this.companyId;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Pool Brain API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get customer details
   * Endpoint: GET /v2/customer_detail
   */
  async getCustomerDetail(params: { offset?: number; limit?: number } = {}) {
    const url = new URL(`${this.baseUrl}/v2/customer_detail`);

    if (params.offset) url.searchParams.append("offset", params.offset.toString());
    if (params.limit) url.searchParams.append("limit", params.limit.toString());

    const headers: Record<string, string> = {
      "ACCESS-KEY": this.apiKey,
      "Content-Type": "application/json",
    };

    if (this.companyId) {
      headers["COMPANY-ID"] = this.companyId;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Pool Brain API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get customer notes
   * Endpoint: GET /v2/customer_notes_detail
   */
  async getCustomerNotes(params: { offset?: number; limit?: number } = {}) {
    const url = new URL(`${this.baseUrl}/v2/customer_notes_detail`);

    if (params.offset) url.searchParams.append("offset", params.offset.toString());
    if (params.limit) url.searchParams.append("limit", params.limit.toString());

    const headers: Record<string, string> = {
      "ACCESS-KEY": this.apiKey,
      "Content-Type": "application/json",
    };

    if (this.companyId) {
      headers["COMPANY-ID"] = this.companyId;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Pool Brain API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get customer pool details
   * Endpoint: GET /v2/customer_pool_details
   */
  async getCustomerPoolDetails(params: { offset?: number; limit?: number } = {}) {
    const url = new URL(`${this.baseUrl}/v2/customer_pool_details`);

    if (params.offset) url.searchParams.append("offset", params.offset.toString());
    if (params.limit) url.searchParams.append("limit", params.limit.toString());

    const headers: Record<string, string> = {
      "ACCESS-KEY": this.apiKey,
      "Content-Type": "application/json",
    };

    if (this.companyId) {
      headers["COMPANY-ID"] = this.companyId;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Pool Brain API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get invoice list
   * Endpoint: GET /v2/invoice_list
   */
  async getInvoiceList(params: { offset?: number; limit?: number } = {}) {
    const url = new URL(`${this.baseUrl}/v2/invoice_list`);

    if (params.offset) url.searchParams.append("offset", params.offset.toString());
    if (params.limit) url.searchParams.append("limit", params.limit.toString());

    const headers: Record<string, string> = {
      "ACCESS-KEY": this.apiKey,
      "Content-Type": "application/json",
    };

    if (this.companyId) {
      headers["COMPANY-ID"] = this.companyId;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Pool Brain API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
