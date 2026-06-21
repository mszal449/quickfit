import { useQueryClient } from "@tanstack/react-query";
import { useLogoutApiAuthLogoutPost } from "../api/generated/auth/auth";

export function useAuth() {
  const queryClient = useQueryClient();

  const logoutMutation = useLogoutApiAuthLogoutPost({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
        window.location.href = "/login";
      },
    },
  });

  const login = () => {
    window.location.href = "/api/auth/google/login";
  };
  const logout = () => logoutMutation.mutate();
  return { login, logout };
}
