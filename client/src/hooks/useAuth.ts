import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

type UserWithStoreInfo = User & {
  hasStore?: boolean;
};

export function useAuth() {
  const { data: user, isLoading } = useQuery<UserWithStoreInfo>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
