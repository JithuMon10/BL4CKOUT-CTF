/**
 * BL4CKOUT Runtime Client
 *
 * Secure Next.js server-side SDK for communicating with the BL4CKOUT Runtime microservice.
 * This file MUST ONLY be imported and executed inside Next.js Server Components, Server Actions,
 * or App Router API routes. The RUNTIME_API_KEY is never exposed to the client browser.
 */

export interface RuntimeInstanceResponse {
  instanceId: string;
  challengeId: string;
  userId: string;
  teamId?: string;
  status: 'pending' | 'running' | 'terminating' | 'terminated' | 'failed';
  host: string;
  port: number;
  protocol: 'nc' | 'http' | 'tcp';
  connectionCommand: string;
  createdAt: string;
  expiresAt: string;
  timeRemainingSeconds: number;
}

export interface SpawnInstancePayload {
  challengeId: string;
  userId: string;
  teamId?: string;
  durationMins?: number;
}

export interface RenewInstancePayload {
  instanceId: string;
  userId: string;
  additionalMins?: number;
}

export interface CreateChallengeFolderPayload {
  challengeId: string;
  folderName?: string;
  title: string;
  category: string;
  template: 'nc' | 'http' | 'flask' | 'php' | 'pwn' | 'crypto';
  internalPort?: number;
  protocol?: 'nc' | 'http' | 'tcp';
  memoryMb?: number;
  cpuQuota?: number;
  pidsLimit?: number;
  timeoutMins?: number;
  dockerfileOverride?: string;
  flag?: string;
}

export interface TerminateInstancePayload {
  instanceId: string;
  userId: string;
}

export interface RuntimeApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  error?: string;
}

class RuntimeClient {
  private get baseUrl(): string {
    const url = process.env.RUNTIME_API_URL || 'http://127.0.0.1:4000/api/v1';
    return url.replace(/\/$/, '');
  }

  private get apiKey(): string {
    const key = process.env.RUNTIME_API_KEY || 'bl4ckout_runtime_secret_key_2026';
    if (!key) {
      throw new Error('[RuntimeClient Error] RUNTIME_API_KEY is not configured in server environment.');
    }
    return key;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<RuntimeApiResponse<T>> {
    const fullUrl = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...(options.headers as Record<string, string> || {}),
    };

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `Runtime API returned HTTP ${response.status}`);
      }

      return data as RuntimeApiResponse<T>;
    } catch (err: any) {
      console.error(`[RuntimeClient] Fetch error for ${endpoint}:`, err.message);
      throw new Error(err.message || 'Failed to communicate with BL4CKOUT Runtime service.');
    }
  }

  /**
   * Spawns a new dynamic container instance for a given challenge and user.
   */
  public async spawnInstance(payload: SpawnInstancePayload): Promise<RuntimeInstanceResponse> {
    const res = await this.request<RuntimeInstanceResponse>('/instances/spawn', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to spawn container instance.');
    }

    return res.data;
  }

  /**
   * Extends the lifetime of an active running instance.
   */
  public async renewInstance(payload: RenewInstancePayload): Promise<RuntimeInstanceResponse> {
    const res = await this.request<RuntimeInstanceResponse>('/instances/renew', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to renew container instance.');
    }

    return res.data;
  }

  /**
   * Immediately terminates a running container instance.
   */
  public async terminateInstance(payload: TerminateInstancePayload): Promise<boolean> {
    const res = await this.request<boolean>('/instances/terminate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return res.success;
  }

  /**
   * Gets details for a specific instance ID.
   */
  public async getInstance(instanceId: string): Promise<RuntimeInstanceResponse | null> {
    try {
      const res = await this.request<RuntimeInstanceResponse>(`/instances/${encodeURIComponent(instanceId)}`, {
        method: 'GET',
      });
      return res.data || null;
    } catch {
      return null;
    }
  }

  /**
   * Fetches all active running instances for a user ID.
   */
  public async getUserInstances(userId: string): Promise<RuntimeInstanceResponse[]> {
    try {
      const res = await this.request<RuntimeInstanceResponse[]>(`/instances/user/${encodeURIComponent(userId)}`, {
        method: 'GET',
      });
      return res.data || [];
    } catch {
      return [];
    }
  }

  /**
   * Generates a new dynamic challenge folder and Docker image on the runtime server.
   */
  /**
   * Rebuilds/compiles the Docker image for a dynamic challenge on the runtime microservice.
   */
  public async compileChallenge(payload: { challengeId: string; folderName?: string }): Promise<any> {
    const res = await this.request<any>('/challenges/compile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  }

  public async createChallengeFolder(payload: CreateChallengeFolderPayload): Promise<any> {
    const res = await this.request<any>('/challenges/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

}

export const runtimeClient = new RuntimeClient();
