const BASE_URL = 'https://track.onestepgps.com/v3/api/public';

interface OneStepGPSConfig {
  apiKey: string;
}

interface Device {
  device_id: string;
  display_name: string;
  active_state: string;
  online: boolean;
  vin?: string;
  license_plate?: string;
  make?: string;
  model?: string;
  year?: string;
  driver_name?: string;
  device_groups?: string[];
  latest_device_point: {
    lat: number;
    lng: number;
    speed: number;
    heading: number;
    altitude: number;
    dt_tracker: string;
    address?: string;
    formatted_address?: string;
    params: {
      odometer?: number;
      engine_hours?: number;
      fuel_level?: number;
      battery_voltage?: number;
      backup_voltage?: number;
      ignition?: boolean;
      cell_signal?: number;
      rssi?: number;
      gps_accuracy?: number;
    };
  };
  latest_accurate_device_point: {
    lat: number;
    lng: number;
    speed: number;
    dt_tracker: string;
  };
}

interface Trip {
  trip_id: string;
  device_id: string;
  start_time: string;
  end_time: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  start_address?: string;
  end_address?: string;
  distance_miles: number;
  duration_seconds: number;
  max_speed: number;
  avg_speed: number;
  idle_time_seconds: number;
  stops_count: number;
}

interface TripStop {
  stop_id: string;
  lat: number;
  lng: number;
  address?: string;
  arrival_time: string;
  departure_time: string;
  duration_seconds: number;
  idle_time_seconds: number;
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
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${BASE_URL}${endpoint}${separator}api-key=${this.apiKey}`;
    const headers = {
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

export type { Device, Geofence, GeofenceEvent, DriveEvent, Trip, TripStop };

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'BreakpointBI/1.0 (pool-management-app)',
        },
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.display_name || null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}
