import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, businessName: string) => Promise<void>;
  logout: () => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('fishcatch_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(url, { ...options, headers });
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetchWithAuth('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          localStorage.removeItem('fishcatch_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server returned error (${res.status}): ${res.statusText || 'Invalid response'}`);
    }
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to login');
    }
    localStorage.setItem('fishcatch_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const signup = async (email: string, password: string, name: string, businessName: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, businessName })
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server returned error (${res.status}): ${res.statusText || 'Invalid response'}`);
    }
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to sign up');
    }
    localStorage.setItem('fishcatch_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('fishcatch_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
