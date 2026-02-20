import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../stores/auth-store';
import { loginApi, registerApi, logoutApi, getMeApi } from '../api/auth';
import { setToken, clearToken } from '../api/client';

export function useCurrentUser() {
  const { isAuthenticated } = useAuthContext();
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await getMeApi();
      return res.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const { setAuth } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginApi(email, password),
    onSuccess: (res) => {
      setToken(res.data.token);
      setAuth(res.data.user, res.data.token);
      queryClient.setQueryData(['currentUser'], res.data.user);
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password, displayName }: { email: string; password: string; displayName: string }) =>
      registerApi(email, password, displayName),
    onSuccess: (res) => {
      setToken(res.data.token);
      setAuth(res.data.user, res.data.token);
      queryClient.setQueryData(['currentUser'], res.data.user);
    },
  });
}

export function useLogout() {
  const { clearAuth } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      clearToken();
      clearAuth();
      queryClient.clear();
    },
    onError: () => {
      clearToken();
      clearAuth();
      queryClient.clear();
    },
  });
}
