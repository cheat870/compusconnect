import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

export interface User {
  id: number;
  email: string;
  fullName: string;
  fullNameKm?: string;
  role: 'platform_admin' | 'university_admin' | 'organizer' | 'student';
  universityId: number | null;
  universityNameEn?: string;
  universityNameKm?: string;
  universityAcronym?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  quickLoginAs: (role: 'admin' | 'rupp_admin' | 'rupp_organizer' | 'student') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('campusconnect_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMe = async () => {
      const savedToken = localStorage.getItem('campusconnect_token');
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          const u = res.data.data;
          setUser({
            id: u.id,
            email: u.email,
            fullName: u.full_name,
            fullNameKm: u.full_name_km,
            role: u.role,
            universityId: u.university_id,
            universityNameEn: u.university_name_en,
            universityNameKm: u.university_name_km,
            universityAcronym: u.university_acronym,
            phone: u.phone,
          });
        }
      } catch (err) {
        localStorage.removeItem('campusconnect_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { token: receivedToken, user: receivedUser } = res.data.data;
      localStorage.setItem('campusconnect_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
    }
  };

  const register = async (payload: any) => {
    const res = await api.post('/auth/register', payload);
    if (res.data.success) {
      const { token: receivedToken, user: receivedUser } = res.data.data;
      localStorage.setItem('campusconnect_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
    }
  };

  const logout = () => {
    localStorage.removeItem('campusconnect_token');
    setToken(null);
    setUser(null);
  };

  const quickLoginAs = async (role: 'admin' | 'rupp_admin' | 'rupp_organizer' | 'student') => {
    const accounts = {
      admin: { email: 'admin@campusconnect.edu.kh', password: 'Password123!' },
      rupp_admin: { email: 'rupp.admin@rupp.edu.kh', password: 'Password123!' },
      rupp_organizer: { email: 'ckcc.organizer@rupp.edu.kh', password: 'Password123!' },
      student: { email: 'student@rupp.edu.kh', password: 'Password123!' },
    };
    const creds = accounts[role];
    if (creds) {
      await login(creds.email, creds.password);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, quickLoginAs }}>
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
