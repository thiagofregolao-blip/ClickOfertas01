import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let text = res.statusText;
    try {
      // Tentar ler como JSON primeiro
      const json = await res.json();
      text = json.message || JSON.stringify(json);
    } catch {
      // Se falhar, ler como texto
      try {
        text = await res.text() || res.statusText;
      } catch {
        text = res.statusText;
      }
    }
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false, 
      refetchOnMount: true, // Permite refetch no mount para dados atualizados
      refetchOnReconnect: true, // Refetch ao reconectar
      staleTime: 2 * 60 * 1000, // 2 minutos - otimizado para mobile
      gcTime: 15 * 60 * 1000, // 15 minutos - otimizado para mobile
      retry: (failureCount, error: any) => {
        // Nunca retry em erro 401 ou 403
        if (error?.message?.includes('401') || error?.message?.includes('403')) {
          return false;
        }
        return failureCount < 2; // Até 2 tentativas
      },
    },
    mutations: {
      retry: false,
    },
  },
});
