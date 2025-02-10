import { QueryClient, QueryFunction } from "@tanstack/react-query";

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

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = `${API_URL}${url}`;
  console.log(`Making ${method} request to ${fullUrl}`, data);
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('API Request failed:', error);
    throw new Error(getErrorMessage(error));
  }
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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
