import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

type UserWithStoreInfo = User & {
  hasStore?: boolean;
};

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<UserWithStoreInfo>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
