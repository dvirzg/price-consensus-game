import { QueryClient } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL;

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

const apiBaseUrl = import.meta.env.DEV ? '' : '/price-consensus-game';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export async function apiRequest(method: string, path: string, body?: any) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "An error occurred" }));
    throw new Error(error.message || "Failed to make request");
  }

  return response;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const fullUrl = `${API_URL}${queryKey[0]}`;
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
