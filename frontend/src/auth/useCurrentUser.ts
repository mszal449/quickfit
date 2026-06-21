import { useMeApiAuthMeGet } from "../api/generated/auth/auth";

export function useCurrentUser() {
  return useMeApiAuthMeGet({
    query: {
      staleTime: Infinity,
      retry: false,
    },
  });
}
