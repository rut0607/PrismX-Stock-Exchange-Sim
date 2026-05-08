import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';

export function useAuth() {
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  const login = async (email: string, password: string) => {
    const result = await authService.login(email, password);
    setAuth(result.user, result.access_token);
    return result;
  };

  const signup = async (email: string, password: string) => {
    const result = await authService.signup(email, password);
    setAuth(result.user, result.access_token);
    return result;
  };

  const logout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  return { user, token, isAuthenticated, login, signup, logout };
}