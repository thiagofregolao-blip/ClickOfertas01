import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

type UserWithStoreInfo = User & {
  hasStore?: boolean;
};

export function useAuth() {
  const { data: user, isLoading } = useQuery<UserWithStoreInfo>({
    queryKey: ["/api/auth/user"],
    staleTime: 2 * 60 * 1000, // 2 minutos para dados do usuário
    refetchOnWindowFocus: true, // Importante para auth
    // Usa as configurações globais que retornam null em 401
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
