import React, { useState } from 'react';
import { useLanguage } from '../i18n/context.js';
import { useAuth } from '../context/AuthContext.js';
import { X, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { language, t } = useLanguage();
  const { login, register, quickLoginAs } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [universityId, setUniversityId] = useState(1);
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({
          email,
          password,
          fullName,
          universityId,
          studentIdNumber,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setMode('login')}
            className={`pb-2.5 px-4 font-bold text-xs transition-colors ${
              mode === 'login'
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {t.nav.login}
          </button>
          <button
            onClick={() => setMode('register')}
            className={`pb-2.5 px-4 font-bold text-xs transition-colors ${
              mode === 'register'
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Student {t.nav.register}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'register' && (
            <>
              <div>
                <label className="font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sokha Chan"
                  className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Student ID Number</label>
                <input
                  type="text"
                  value={studentIdNumber}
                  onChange={(e) => setStudentIdNumber(e.target.value)}
                  placeholder="e.g. RUPP-2024-00142"
                  className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">University Affiliation</label>
                <select
                  value={universityId}
                  onChange={(e) => setUniversityId(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-xs"
                >
                  <option value={1}>Royal University of Phnom Penh (RUPP)</option>
                  <option value={2}>Institute of Technology of Cambodia (ITC)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="font-semibold text-slate-700">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@rupp.edu.kh"
              className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-colors text-xs mt-2"
          >
            {loading ? 'Please wait...' : mode === 'login' ? t.nav.login : 'Create Student Account'}
          </button>
        </form>

        {/* Quick Demo Accounts */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> One-Click Local Testing Personas
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              onClick={async () => {
                await quickLoginAs('student');
                onClose();
              }}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-left"
            >
              <div className="font-bold text-slate-800">Student</div>
              <div className="text-[10px] text-slate-400">student@rupp.edu.kh</div>
            </button>

            <button
              onClick={async () => {
                await quickLoginAs('rupp_organizer');
                onClose();
              }}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-left"
            >
              <div className="font-bold text-slate-800">RUPP Organizer</div>
              <div className="text-[10px] text-slate-400">ckcc.organizer@rupp.edu.kh</div>
            </button>

            <button
              onClick={async () => {
                await quickLoginAs('rupp_admin');
                onClose();
              }}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-left"
            >
              <div className="font-bold text-slate-800">RUPP Admin</div>
              <div className="text-[10px] text-slate-400">rupp.admin@rupp.edu.kh</div>
            </button>

            <button
              onClick={async () => {
                await quickLoginAs('admin');
                onClose();
              }}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-left"
            >
              <div className="font-bold text-slate-800">Platform Admin</div>
              <div className="text-[10px] text-slate-400">admin@campusconnect...</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
