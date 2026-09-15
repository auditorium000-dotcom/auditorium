import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authClient, signIn, signOut } from '../lib/auth-client';

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshSession = useCallback(async () => {
    try {
      const session = await authClient.getSession();
      if (session.data?.user) {
        setUser({
          id: session.data.user.id,
          name: session.data.user.name,
          email: session.data.user.email,
          image: session.data.user.image,
          emailVerified: session.data.user.emailVerified,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await signIn.email({
        email: email.trim(),
        password,
      });

      if (response.error) {
        return {
          success: false,
          error: response.error.message || 'Invalid email or password',
        };
      }

      await refreshSession();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      return {
        success: false,
        error: message,
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut();
      setUser(null);
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
