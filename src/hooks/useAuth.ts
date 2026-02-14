import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });
  const navigate = useNavigate();

  // Check if already authenticated on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } else {
      setState({
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  const login = useCallback(async (password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authApi.login(password);

      if (response.success) {
        localStorage.setItem('auth_token', password);
        setState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        navigate('/');
        return true;
      } else {
        setState({
          isAuthenticated: false,
          isLoading: false,
          error: response.message || 'Login failed',
        });
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during login';
      setState({
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      return false;
    }
  }, [navigate]);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    navigate('/login');
  }, [navigate]);

  return {
    ...state,
    login,
    logout,
  };
}
