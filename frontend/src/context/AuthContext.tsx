import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { FALLBACK_UNIVERSITIES } from '../data/fallbackData.js';

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
  studentIdNumber?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: { fullName?: string; fullNameKm?: string; phone?: string }) => Promise<void>;
  changePassword: (payload: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<void>;
  quickLoginAs: (role: 'admin' | 'rupp_admin' | 'rupp_organizer' | 'student') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('campusconnect_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMe = async () => {
    const savedToken = localStorage.getItem('campusconnect_token');
    if (!savedToken) {
      setLoading(false);
      return;
    }

    // Check if there is a saved local user
    const savedUserStr = localStorage.getItem('campusconnect_current_user');
    if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        setUser(u);
      } catch (e) {
        // ignore JSON parse error
      }
    }

    try {
      const res = await api.get('/users/me');
      if (res.data?.success) {
        const u = res.data.data;
        const mappedUser: User = {
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
          studentIdNumber: u.student_id_number,
        };
        setUser(mappedUser);
        localStorage.setItem('campusconnect_current_user', JSON.stringify(mappedUser));
      }
    } catch (err: any) {
      // Only clear user on actual 401 Unauthorized from live backend
      if (err.response?.status === 401) {
        localStorage.removeItem('campusconnect_token');
        localStorage.removeItem('campusconnect_current_user');
        setToken(null);
        setUser(null);
      }
      // If network error (offline or backend not yet linked), keep local user intact
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data && res.data.success && res.data.data) {
        const { token: receivedToken, user: receivedUser } = res.data.data;
        localStorage.setItem('campusconnect_token', receivedToken);
        localStorage.setItem('campusconnect_current_user', JSON.stringify(receivedUser));
        setToken(receivedToken);
        setUser(receivedUser);
        return;
      }
    } catch (err: any) {
      // If server returned a business validation error (e.g. 401 Invalid credentials), throw it
      if (err.response?.status && err.response.status === 401 && typeof err.response.data?.error === 'string') {
        throw err;
      }
      // If network error (offline / standalone Netlify mode):
      console.warn('Backend offline, creating local authenticated session:', err?.message || err);
    }

    const lower = email.toLowerCase().trim();
    let localUser: User;
    if (lower.includes('admin') && !lower.includes('rupp')) {
      localUser = {
        id: 1,
        email,
        fullName: 'Platform Administrator',
        fullNameKm: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ',
        role: 'platform_admin',
        universityId: null,
      };
    } else if (lower.includes('rupp.admin')) {
      localUser = {
        id: 2,
        email,
        fullName: 'RUPP Administrator',
        fullNameKm: 'អ្នកគ្រប់គ្រង RUPP',
        role: 'university_admin',
        universityId: 1,
        universityNameEn: 'Royal University of Phnom Penh (RUPP)',
        universityNameKm: 'សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ',
        universityAcronym: 'RUPP',
      };
    } else if (lower.includes('organizer')) {
      localUser = {
        id: 3,
        email,
        fullName: 'RUPP Event Coordinator',
        fullNameKm: 'អ្នករៀបចំព្រឹត្តិការណ៍ RUPP',
        role: 'organizer',
        universityId: 1,
        universityNameEn: 'Royal University of Phnom Penh (RUPP)',
        universityNameKm: 'សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ',
        universityAcronym: 'RUPP',
      };
    } else {
      const saved = localStorage.getItem('campusconnect_current_user');
      const parsed = saved ? JSON.parse(saved) : null;
      localUser = parsed && parsed.email === email ? parsed : {
        id: Date.now(),
        email,
        fullName: email.split('@')[0],
        fullNameKm: email.split('@')[0],
        role: 'student',
        universityId: 1,
        universityNameEn: 'Royal University of Phnom Penh (RUPP)',
        universityNameKm: 'សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ',
        universityAcronym: 'RUPP',
      };
    }

    const localToken = 'demo_token_' + Date.now();
    localStorage.setItem('campusconnect_token', localToken);
    localStorage.setItem('campusconnect_current_user', JSON.stringify(localUser));
    setToken(localToken);
    setUser(localUser);
  };

  const register = async (payload: any) => {
    try {
      const res = await api.post('/auth/register', payload);
      if (res.data && res.data.success && res.data.data) {
        const { token: receivedToken, user: receivedUser } = res.data.data;
        localStorage.setItem('campusconnect_token', receivedToken);
        localStorage.setItem('campusconnect_current_user', JSON.stringify(receivedUser));
        setToken(receivedToken);
        setUser(receivedUser);
        return;
      }
    } catch (err: any) {
      // If server returned a business validation error (e.g. 409 Email already exists), throw it
      if (err.response?.status && err.response.status >= 400 && err.response.status < 500 && typeof err.response.data?.error === 'string') {
        throw err;
      }
      console.warn('Backend offline or unlinked, creating client student session:', err?.message || err);
    }

    // Client-side fallback session for offline / static Netlify demo:
    const targetUni = FALLBACK_UNIVERSITIES.find((u) => u.id === Number(payload.universityId)) || FALLBACK_UNIVERSITIES[0];
    const newUser: User = {
      id: Date.now(),
      email: payload.email,
      fullName: payload.fullName || 'Student',
      fullNameKm: payload.fullNameKm || payload.fullName,
      role: 'student',
      universityId: targetUni.id,
      universityNameEn: targetUni.name_en,
      universityNameKm: targetUni.name_km,
      universityAcronym: targetUni.acronym,
      phone: payload.phone,
      studentIdNumber: payload.studentIdNumber || 'STU-' + Math.floor(10000 + Math.random() * 90000),
    };

    const localToken = 'demo_token_' + Date.now();
    localStorage.setItem('campusconnect_token', localToken);
    localStorage.setItem('campusconnect_current_user', JSON.stringify(newUser));
    setToken(localToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('campusconnect_token');
      localStorage.removeItem('campusconnect_current_user');
      setToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (payload: { fullName?: string; fullNameKm?: string; phone?: string }) => {
    const res = await api.patch('/users/me', payload);
    if (res.data.success) {
      await fetchMe();
    }
  };

  const changePassword = async (payload: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    await api.patch('/users/me/password', payload);
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
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        quickLoginAs,
      }}
    >
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

export default AuthContext;
