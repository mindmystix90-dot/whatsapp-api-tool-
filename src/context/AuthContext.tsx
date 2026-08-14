import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types.js';

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
      try {
        const res = await fetchWithAuth('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          localStorage.removeItem('fishcatch_token');
          setToken(null);
          // In personal mode, fallback to default personal user object
          setUser({
            id: 'user_admin_platform',
            email: 'admin@fishcatch.io',
            name: 'Fishcatch Personal Admin',
            role: 'admin',
            business_id: 'bus_admin_platform',
            created_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('Auth check error:', err);
        // Fallback to personal user so app is directly accessible
        setUser({
          id: 'user_admin_platform',
          email: 'admin@fishcatch.io',
          name: 'Fishcatch Personal Admin',
          role: 'admin',
          business_id: 'bus_admin_platform',
          created_at: new Date().toISOString()
        });
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
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch (err) {
        console.error('Failed to parse JSON response:', err);
      }
    } else {
      const rawText = await res.text().catch(() => '');
      console.error(`Non-JSON response received from server (${res.status}):`, rawText);
      data = {
        error: `Server returned non-JSON response (${res.status})`,
        details: rawText.substring(0, 200) || res.statusText || 'Unknown server response'
      };
    }

    if (!res.ok) {
      const errMsg = data?.details 
        ? `${data.error || 'Login failed'}: ${data.details}` 
        : (data?.error || `Login failed with status ${res.status}`);
      throw new Error(errMsg);
    }

    if (!data?.token || !data?.user) {
      throw new Error('Invalid authentication response from server.');
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
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch (err) {
        console.error('Failed to parse JSON response:', err);
      }
    } else {
      const rawText = await res.text().catch(() => '');
      console.error(`Non-JSON response received from server (${res.status}):`, rawText);
      data = {
        error: `Server returned non-JSON response (${res.status})`,
        details: rawText.substring(0, 200) || res.statusText || 'Unknown server response'
      };
    }

    if (!res.ok) {
      const errMsg = data?.details 
        ? `${data.error || 'Registration failed'}: ${data.details}` 
        : (data?.error || `Registration failed with status ${res.status}`);
      throw new Error(errMsg);
    }

    if (!data?.token || !data?.user) {
      throw new Error('Invalid registration response from server.');
    }

    localStorage.setItem('fishcatch_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('fishcatch_token');
    setToken(null);
    fetchWithAuth('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        // Retain personal user if network request fails
      });
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
