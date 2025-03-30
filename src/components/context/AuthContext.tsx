// src/components/context/AuthContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authReducer } from './authReducer';
import api from '@/services/api';
import { AuthState, User } from '@/types/auth.types';

interface AuthContextProps {
  state: AuthState;
  login: () => void;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null,
};

const AuthContext = createContext<AuthContextProps>({
  state: initialState,
  login: () => {},
  logout: () => {},
  loadUser: async () => {},
  clearError: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    if (state.token) {
      api.setAuthToken(state.token);
    } else {
      api.removeAuthToken();
    }
  }, [state.token]);

  useEffect(() => {
    const initializeAuth = async () => {
      if (localStorage.getItem('token')) {
        try {
          await loadUser();
        } catch (err) {
          dispatch({ type: 'AUTH_ERROR' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  const login = () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    console.log("Redirecting to backend login endpoint...");
    // Redirect to your backend login endpoint.
    window.location.href = `${import.meta.env.VITE_APP_API_URL}/api/login`;

  };

  const loadUser = async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await api.get<User>('/api/user');
      // Log complete user data for debugging
      console.log("User data from API:", res.data);
      
      // Check if the user object has a valid profile picture URL.
      if (!res.data.picture) {
        console.warn("User object does not have a 'picture' property. Check API response or property naming.");
      } else {
        console.log("User picture URL:", res.data.picture);
      }
      
      dispatch({
        type: 'USER_LOADED',
        payload: res.data,
      });
    } catch (err: any) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: err.response?.data?.error || 'Authentication failed',
      });
      throw err;
    }
  };

  const logout = () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    api.post('/api/logout')
      .then(() => {
        dispatch({ type: 'LOGOUT' });
      })
      .catch((err) => {
        console.error('Logout error:', err);
        dispatch({ type: 'LOGOUT' });
      });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        logout,
        loadUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
