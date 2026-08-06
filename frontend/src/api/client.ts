// Central API Client with in-Memory Access Token Storage & Automated Request Queued Refresh Interceptor

type RefreshCallback = (accessToken: string) => void;

class ApiClient {
    private baseUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    private accessToken: string | null = null;
    private isRefreshing: boolean = false;
    private refreshSubscribers: RefreshCallback[] = [];
    private onAuthFailure: (() => void) | null = null;

    setAccessToken(token: string | null) {
        this.accessToken = token;
    }

    getAccessToken(): string | null {
        return this.accessToken;
    }

    registerAuthFailureCallback(callback: () => void) {
        this.onAuthFailure = callback;
    }

    private subscribeTokenRefresh(cb: RefreshCallback) {
        this.refreshSubscribers.push(cb);
    }

    private onRefreshed(newAccessToken: string) {
        this.refreshSubscribers.map((cb) => cb(newAccessToken));
        this.refreshSubscribers = [];
    }

    async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

        // Set headers
        const headers = new Headers(options.headers || {});
        if (this.accessToken) {
            headers.set('Authorization', `Bearer ${this.accessToken}`);
        }
        if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        const config: RequestInit = {
            ...options,
            headers,
            // Crucial: include cookies for httpOnly refresh tokens
            credentials: 'include',
        };

        try {
            const response = await fetch(url, config);

            if (response.status === 401) {
                // If it's a verify refresh call itself that fails 401, don't loop it
                if (endpoint.includes('/auth/refresh') || endpoint.includes('/auth/login')) {
                    this.accessToken = null;
                    if (this.onAuthFailure) this.onAuthFailure();
                    throw new Error('Authentication failed');
                }

                // Access token expired, attempt refresh
                if (!this.isRefreshing) {
                    this.isRefreshing = true;
                    this.attemptRefresh()
                        .then((newAccessToken) => {
                            this.isRefreshing = false;
                            this.onRefreshed(newAccessToken);
                        })
                        .catch(() => {
                            this.isRefreshing = false;
                            this.accessToken = null;
                            this.refreshSubscribers = [];
                            if (this.onAuthFailure) this.onAuthFailure();
                        });
                }

                // Queue other failed requests while refreshing
                return new Promise<T>((resolve, reject) => {
                    this.subscribeTokenRefresh((newAccessToken) => {
                        headers.set('Authorization', `Bearer ${newAccessToken}`);
                        fetch(url, { ...config, headers })
                            .then(async (retryRes) => {
                                if (!retryRes.ok) {
                                    const errJson = await retryRes.json().catch(() => ({}));
                                    reject(errJson || { detail: 'Retry failed' });
                                } else {
                                    const data = await retryRes.json().catch(() => ({}));
                                    resolve(data as T);
                                }
                            })
                            .catch(reject);
                    });
                });
            }

            if (!response.ok) {
                let errorData: any = { detail: 'An error occurred' };
                try {
                    errorData = await response.json();
                } catch (e) {
                    // ignore parsing error
                }
                throw errorData;
            }

            // Check if response contains json
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return (await response.json()) as T;
            }
            return {} as T;
        } catch (error) {
            throw error;
        }
    }

    private async attemptRefresh(): Promise<string> {
        const url = `${this.baseUrl}/auth/refresh`;
        const res = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            throw new Error('Refresh failed');
        }

        const data = await res.json();
        const token = data.access_token;
        this.accessToken = token;
        return token;
    }

    // HTTP helper shorthand methods
    get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    post<T>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    patch<T>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

export const apiClient = new ApiClient();
export default apiClient;
