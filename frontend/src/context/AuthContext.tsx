import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '@/config'; // Import at the top

// ⚠️ CHANGE THIS TO YOUR WINDOWS/HOTSPOT IP
const BASE_URL = API_URL;

interface User {
  id: string;
  name: string;
  role: string;
  department: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean; // ✅ Added this property
  login: (employeeId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // ✅ Added loading state (starts true to prevent flashing Login page)
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setIsLoading(false); // ✅ Turn off loading once check is done
  }, []);

  const login = async (employeeId: string, password: string) => {
    try {
      const response = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: employeeId, password }),
      });

      const data = await response.json();

      if (data.success) {
        const loggedInUser = {
          id: data.id,
          name: data.name,
          role: data.role,
          department: data.department || 'General'
        };

        setUser(loggedInUser);
        setToken('dummy-token');
        localStorage.setItem('user', JSON.stringify(loggedInUser));
        localStorage.setItem('token', 'dummy-token');
        return { success: true };
      } else {
        return { success: false, error: data.message || 'Invalid credentials' };
      }
    } catch (error) {
      return { success: false, error: 'Server connection failed' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};