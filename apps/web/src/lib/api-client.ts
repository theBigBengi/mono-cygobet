const API_BASE_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000");

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, body?: { message?: string; code?: string }) {
    super(body?.message ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
};

class HttpClient {
  private accessToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;
  private onAuthLost?: () => void;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken() {
    return this.accessToken;
  }

  setOnAuthLost(callback: () => void) {
    this.onAuthLost = callback;
  }

  async fetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.rawFetch(path, options);

    if (response.status === 401) {
      const newToken = await this.refresh();
      if (newToken) {
        const retryResponse = await this.rawFetch(path, options);
        return this.handleResponse<T>(retryResponse);
      }
      this.onAuthLost?.();
      throw new ApiError(401, { message: "Unauthorized" });
    }

    return this.handleResponse<T>(response);
  }

  /** Fetch without auth retry — for public endpoints (login, register, etc.) */
  async publicFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.rawFetch(path, options);
    return this.handleResponse<T>(response);
  }

  private async rawFetch(path: string, options: RequestOptions): Promise<Response> {
    const { body, params, ...init } = options;
    let url = `${API_BASE_URL}${path}`;

    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value != null) searchParams.set(key, String(value));
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Client": "web",
      ...(init.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    return globalThis.fetch(url, {
      ...init,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new ApiError(response.status, data);
    }

    return data as T;
  }

  async refresh(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const response = await globalThis.fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Client": "web",
          },
          credentials: "include",
          body: JSON.stringify({}),
        });

        if (!response.ok) return null;

        const data = await response.json();
        this.accessToken = data.accessToken;
        return data.accessToken as string;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }
}

export const apiClient = new HttpClient();
