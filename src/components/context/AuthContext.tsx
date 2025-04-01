import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { authReducer } from './authReducer';
import api from '@/services/api';
import { AuthState, User } from '@/types/auth.types';

interface AuthContextProps {
  state: AuthState;
  login: () => void;
  logout: () => void;
  loadUser: () => Promise<void>;
  setToken: (token: string) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextProps>({} as AuthContextProps);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    isAuthenticated: false,
    user: null,
    token: localStorage.getItem('token'),
    loading: true,
    error: null,
  });

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
    api.removeAuthToken();
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const res = await api.get<User>('/api/user');
      dispatch({ type: 'USER_LOADED', payload: res.data });
    } catch (err) {
      logout();
      throw err;
    }
  }, [logout]);

  const setToken = useCallback((token: string) => {
    localStorage.setItem('token', token);
    dispatch({ type: 'SET_TOKEN', payload: token });
  }, []);

  const login = useCallback(() => {
    dispatch({ type: 'SET_LOADING', payload: true });
    // Redirect to the login endpoint of your backend
    window.location.href = `${import.meta.env.VITE_APP_API_URL}/api/login`;
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  useEffect(() => {
    const initializeAuth = async () => {
      if (state.token && !state.user) {
        try {
          await loadUser();
        } catch (err) {
          // Error already handled in loadUser
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    initializeAuth();
  }, [state.token, state.user, loadUser]);

  const value = useMemo(
    () => ({
      state,
      login,
      logout,
      loadUser,
      setToken,
      clearError,
    }),
    [state, login, logout, loadUser, setToken, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
