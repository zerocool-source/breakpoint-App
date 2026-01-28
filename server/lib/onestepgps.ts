const BASE_URL = 'https://track.onestepgps.com/v3/api/public';

interface OneStepGPSConfig {
  apiKey: string;
}

interface Device {
  device_id: string;
  display_name: string;
  active_state: string;
  online: boolean;
  latest_device_point: {
    lat: number;
    lng: number;
    speed: number;
    heading: number;
    altitude: number;
    dt_tracker: string;
    params: {
      odometer?: number;
      engine_hours?: number;
      fuel_level?: number;
      battery_voltage?: number;
      ignition?: boolean;
    };
  };
  latest_accurate_device_point: {
    lat: number;
    lng: number;
    speed: number;
    dt_tracker: string;
  };
}

interface Geofence {
  geofence_id: string;
  name: string;
  type: string;
  coordinates: Array<{ lat: number; lng: number }>;
  radius?: number;
  created_at: string;
}

interface GeofenceEvent {
  event_id: string;
  device_id: string;
  geofence_id: string;
  event_type: 'enter' | 'exit';
  timestamp: string;
  lat: number;
  lng: number;
}

interface DriveEvent {
  event_id: string;
  device_id: string;
  event_type: 'speeding' | 'hard_brake' | 'hard_acceleration' | 'idle' | 'after_hours';
  severity: string;
  timestamp: string;
  lat: number;
  lng: number;
  details: Record<string, any>;
}

class OneStepGPSClient {
  private apiKey: string;

  constructor(config: OneStepGPSConfig) {
    this.apiKey = config.apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OneStepGPS API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getDevices(): Promise<{ result_list: Device[] }> {
    return this.request('/device?latest_point=true');
  }

  async getDevice(deviceId: string): Promise<Device> {
    return this.request(`/device/${deviceId}?latest_point=true`);
  }

  async getGeofences(): Promise<{ result_list: Geofence[] }> {
    return this.request('/geofence');
  }

  async getGeofenceEvents(params: {
    deviceId?: string;
    geofenceId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<{ result_list: GeofenceEvent[] }> {
    const queryParams = new URLSearchParams();
    if (params.deviceId) queryParams.append('device_id', params.deviceId);
    if (params.geofenceId) queryParams.append('geofence_id', params.geofenceId);
    if (params.startDate) queryParams.append('from', params.startDate);
    if (params.endDate) queryParams.append('to', params.endDate);
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return this.request(`/geofence-event?${queryParams.toString()}`);
  }

  async getDriveEvents(params: {
    deviceId?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<{ result_list: DriveEvent[] }> {
    const queryParams = new URLSearchParams();
    if (params.deviceId) queryParams.append('device_id', params.deviceId);
    if (params.eventType) queryParams.append('event_type', params.eventType);
    if (params.startDate) queryParams.append('from', params.startDate);
    if (params.endDate) queryParams.append('to', params.endDate);
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return this.request(`/drive-event?${queryParams.toString()}`);
  }

  async getTrips(deviceId: string, startDate: string, endDate: string): Promise<any> {
    return this.request(`/trip?device_id=${deviceId}&from=${startDate}&to=${endDate}`);
  }

  async getRoute(deviceId: string, startDate: string, endDate: string): Promise<any> {
    return this.request(`/route?device_id=${deviceId}&from=${startDate}&to=${endDate}`);
  }
}

export const onestepgps = new OneStepGPSClient({
  apiKey: process.env.ONESTEPGPS_API_KEY || '',
});

export type { Device, Geofence, GeofenceEvent, DriveEvent };
