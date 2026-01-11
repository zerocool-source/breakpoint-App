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

  /**
   * Get technician details
   * Endpoint: GET /v2/technician_detail
   */
  async getTechnicianDetail(params: { offset?: number; limit?: number } = {}) {
    const url = new URL(`${this.baseUrl}/v2/technician_detail`);

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
   * Get one-time job list
   * Endpoint: GET /v2/one_time_job_list
   */
  async getOneTimeJobList(params: { fromDate?: string; toDate?: string; customerId?: string; offset?: number; limit?: number } = {}) {
    const url = new URL(`${this.baseUrl}/v2/one_time_job_list`);

    if (params.fromDate) url.searchParams.append("fromDate", params.fromDate);
    if (params.toDate) url.searchParams.append("toDate", params.toDate);
    if (params.customerId) url.searchParams.append("customerId", params.customerId);
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
   * Get one-time job list details
   * Endpoint: GET /v2/one_time_job_list_details
   */
  async getOneTimeJobListDetails(params: { fromDate?: string; toDate?: string; offset?: number; limit?: number } = {}) {
    const url = new URL(`${this.baseUrl}/v2/one_time_job_list_details`);

    if (params.fromDate) url.searchParams.append("fromDate", params.fromDate);
    if (params.toDate) url.searchParams.append("toDate", params.toDate);
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
   * Get route stops job list
   * Endpoint: GET /v2/route_stops_job_list
   */
  async getRouteStopsJobList(params: { fromDate?: string; toDate?: string; offset?: number; limit?: number } = {}) {
    const url = new URL(`${this.baseUrl}/v2/route_stops_job_list`);

    if (params.fromDate) url.searchParams.append("fromDate", params.fromDate);
    if (params.toDate) url.searchParams.append("toDate", params.toDate);
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
   * Get route stops job list details
   * Endpoint: GET /v2/route_stops_job_list_details
   */
  async getRouteStopsJobListDetails(params: { fromDate?: string; toDate?: string; jobId?: number | string; offset?: number; limit?: number } = {}) {
    const url = new URL(`${this.baseUrl}/v2/route_stops_job_list_details`);

    if (params.fromDate) url.searchParams.append("fromDate", params.fromDate);
    if (params.toDate) url.searchParams.append("toDate", params.toDate);
    if (params.jobId) url.searchParams.append("jobId", String(params.jobId));
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
   * Get photos for a specific job from route stops or one-time job details
   * Returns normalized photo URLs regardless of job type
   */
  async getJobPhotos(jobId: number | string): Promise<string[]> {
    const photos: string[] = [];
    
    const extractPhotos = (obj: any) => {
      if (!obj) return;
      if (obj.photos && Array.isArray(obj.photos)) {
        obj.photos.forEach((p: any) => {
          const url = p.url || p.URL || p.imageUrl || p.ImageUrl || p.photoUrl || p.PhotoUrl;
          if (url) photos.push(url);
        });
      }
      if (obj.Pictures && Array.isArray(obj.Pictures)) {
        obj.Pictures.forEach((p: any) => {
          const url = p.url || p.URL || p.imageUrl || p.ImageUrl || p.photoUrl || p.PhotoUrl;
          if (url) photos.push(url);
        });
      }
      if (obj.images && Array.isArray(obj.images)) {
        obj.images.forEach((p: any) => {
          const url = p.url || p.URL || p.imageUrl || p.ImageUrl;
          if (url) photos.push(url);
        });
      }
    };
    
    try {
      const routeStopData = await this.getRouteStopsJobListDetails({ jobId });
      
      if (routeStopData.data && Array.isArray(routeStopData.data)) {
        routeStopData.data.forEach((routeStop: any) => {
          extractPhotos(routeStop);
          if (routeStop.jobEntries && Array.isArray(routeStop.jobEntries)) {
            routeStop.jobEntries.forEach((entry: any) => extractPhotos(entry));
          }
          if (routeStop.workflowItems && Array.isArray(routeStop.workflowItems)) {
            routeStop.workflowItems.forEach((item: any) => extractPhotos(item));
          }
        });
      }
    } catch (e) {
      console.log("Route stop photos not found for job", jobId);
    }
    
    try {
      const oneTimeData = await this.getOneTimeJobDetail(jobId);
      if (oneTimeData.data && Array.isArray(oneTimeData.data)) {
        oneTimeData.data.forEach((job: any) => {
          extractPhotos(job);
          if (job.workflowItems && Array.isArray(job.workflowItems)) {
            job.workflowItems.forEach((item: any) => extractPhotos(item));
          }
        });
      }
    } catch (e) {
      console.log("One-time job photos not found for job", jobId);
    }
    
    return Array.from(new Set(photos));
  }

  /**
   * Get single one-time job details including Office Notes
   * Endpoint: GET /v2/one_time_job_list_details with single job filter
   */
  async getOneTimeJobDetail(jobId: number | string) {
    // Try fetching with the job list details endpoint but filter by job
    const url = new URL(`${this.baseUrl}/v2/one_time_job_list_details`);
    url.searchParams.append("jobId", String(jobId));

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
   * Fetch job audit history which may contain office notes
   * Endpoint: GET /v2/job_audit_history
   */
  async getJobAuditHistory(jobId: number | string) {
    const url = new URL(`${this.baseUrl}/v2/job_audit_history`);
    url.searchParams.append("jobId", String(jobId));

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
   * Create a new one-time job in Pool Brain
   * Endpoint: POST /v2/one_time_job_create
   */
  async createOneTimeJob(params: {
    customerId: number;
    poolId?: number;
    technicianId?: number;
    title: string;
    description?: string;
    scheduledDate?: string;
    estimatedDuration?: number;
    priority?: string;
  }) {
    const url = new URL(`${this.baseUrl}/v2/one_time_job_create`);

    const headers: Record<string, string> = {
      "ACCESS-KEY": this.apiKey,
      "Content-Type": "application/json",
    };

    if (this.companyId) {
      headers["COMPANY-ID"] = this.companyId;
    }

    const body: Record<string, any> = {
      CustomerID: params.customerId,
      Title: params.title,
    };

    if (params.poolId) body.PoolID = params.poolId;
    if (params.technicianId) body.TechnicianID = params.technicianId;
    if (params.description) body.Description = params.description;
    if (params.scheduledDate) body.ScheduledDate = params.scheduledDate;
    if (params.estimatedDuration) body.EstimatedDuration = params.estimatedDuration;
    if (params.priority) body.Priority = params.priority;

    const response = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pool Brain API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get technician route details (pools assigned to technicians by day)
   * Endpoint: GET /v2/technician_route_detail
   */
  async getTechnicianRouteDetail(params: { offset?: number; limit?: number } = {}) {
    const url = new URL(`${this.baseUrl}/v2/technician_route_detail`);

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
