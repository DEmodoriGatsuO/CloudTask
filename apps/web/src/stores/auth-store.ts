import { createContext, useContext } from 'react';
import type { User } from '@cloudtask/shared';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: () => {},
  clearAuth: () => {},
});

export function useAuthContext() {
  return useContext(AuthContext);
}
