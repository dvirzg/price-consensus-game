import { QueryClient, QueryFunction, QueryKey, UseQueryOptions } from "@tanstack/react-query";

// Get base URL for GitHub Pages or development
const baseUrl = import.meta.env.DEV ? 'http://localhost:5000' : 'https://price-consensus-game-production.up.railway.app';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error(`API Error: ${res.status}: ${text}`);
    throw new Error(`${res.status}: ${text}`);
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('CORS')) {
      return 'Unable to connect to the server. CORS error.';
    }
    if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
      return 'Unable to connect to the server. Please check your connection.';
    }
    return error.message;
  }
  return 'An unknown error occurred';
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry failed requests
const retryRequest = async <T>(
  fn: () => Promise<T>,
  retries = 5,
  baseDelay = 1000,
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    
    // Exponential backoff with jitter
    const jitter = Math.random() * 200;
    await delay(baseDelay + jitter);
    
    console.log(`Retrying request... ${retries} attempts remaining`);
    return retryRequest(fn, retries - 1, baseDelay * 2);
  }
};

export async function apiRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const url = `${baseUrl}${path}`;
  
  return retryRequest(async () => {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response;
  });
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const fullUrl = `${baseUrl}${queryKey[0]}`;
    console.log(`Making query request to ${fullUrl}`);
    
    try {
      const res = await fetch(fullUrl, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error('Query failed:', error);
      throw new Error(getErrorMessage(error));
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      retry: (failureCount: number, error: Error) => {
        // Don't retry on 404s after the first attempt
        if (error.message.includes('404') && failureCount > 0) {
          return false;
        }
        // Retry other errors up to 5 times
        return failureCount < 5;
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff with jitter
        const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000);
        const jitter = Math.random() * 200;
        return baseDelay + jitter;
      },
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      refetchInterval: (data: unknown) => {
        // If we have no data, retry every second
        if (!data) return 1000;
        // If we have data but it's incomplete, retry every 5 seconds
        if (typeof data === 'object' && (!data || Object.keys(data).length === 0)) return 5000;
        // Otherwise, don't refetch automatically
        return false;
      }
    },
    mutations: {
      retry: 5,
      retryDelay: (attemptIndex) => {
        // Exponential backoff with jitter
        const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000);
        const jitter = Math.random() * 200;
        return baseDelay + jitter;
      }
    },
  },
});
