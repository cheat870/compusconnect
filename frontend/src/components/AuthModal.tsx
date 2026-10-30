import React, { useState } from 'react';
import { useLanguage } from '../i18n/context.js';
import { useAuth } from '../context/AuthContext.js';
import { X, Sparkles, ShieldCheck, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { language, t } = useLanguage();
  const { login, register, quickLoginAs } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [fullNameKm, setFullNameKm] = useState('');
  const [universityId, setUniversityId] = useState(1);
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Password strength validation metrics
  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordStrong = hasMinLength && hasLetter && hasNumber;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (!isPasswordStrong) {
        setError(t.auth.passwordStrengthNotice);
        return;
      }
      if (password !== confirmPassword) {
        setError(t.auth.passwordsDoNotMatch);
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register({
          fullName: fullName.trim(),
          fullNameKm: fullNameKm.trim() || undefined,
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          universityId,
          studentIdNumber: studentIdNumber.trim() || undefined,
          phone: phone.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || (mode === 'login' ? 'Invalid email or password' : 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 transition-colors"
          title={t.common.close}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`pb-2.5 px-4 font-bold text-xs transition-colors ${
              mode === 'login'
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {t.nav.login}
          </button>
          <button
            onClick={() => {
              setMode('register');
              setError(null);
            }}
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
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'register' && (
            <>
              <div>
                <label className="font-semibold text-slate-700">{t.auth.fullName} *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sokha Chan"
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">{t.auth.fullNameKm}</label>
                <input
                  type="text"
                  value={fullNameKm}
                  onChange={(e) => setFullNameKm(e.target.value)}
                  placeholder="ឧ. ចាន់ សុខា"
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">{t.auth.studentId}</label>
                  <input
                    type="text"
                    value={studentIdNumber}
                    onChange={(e) => setStudentIdNumber(e.target.value)}
                    placeholder="RUPP-2024-00142"
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">{t.auth.phone}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="012 345 678"
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">{t.auth.university} *</label>
                <select
                  value={universityId}
                  onChange={(e) => setUniversityId(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  <option value={1}>Royal University of Phnom Penh (RUPP)</option>
                  <option value={2}>Institute of Technology of Cambodia (ITC)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="font-semibold text-slate-700">{t.auth.email} *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@rupp.edu.kh"
              className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">{t.auth.password} *</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {mode === 'register' && password.length > 0 && (
              <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] space-y-1">
                <div className="font-semibold text-slate-700">Password Requirements:</div>
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3" /> Minimum 8 characters
                </div>
                <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3" /> Contains letters (A-Z, a-z)
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3" /> Contains numbers (0-9)
                </div>
              </div>
            )}
          </div>

          {mode === 'register' && (
            <div>
              <label className="font-semibold text-slate-700">{t.auth.confirmPassword} *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  confirmPassword.length > 0
                    ? passwordsMatch
                      ? 'border-emerald-400'
                      : 'border-rose-300'
                    : 'border-slate-200'
                }`}
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-[10px] text-rose-600 mt-1">{t.auth.passwordsDoNotMatch}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-colors text-xs mt-2"
          >
            {loading ? 'Please wait...' : mode === 'login' ? t.nav.login : t.auth.registerTitle}
          </button>
        </form>

        {/* Quick Demo Accounts for Evaluators */}
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
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-left transition-colors"
            >
              <div className="font-bold text-slate-800">Student</div>
              <div className="text-[10px] text-slate-400">student@rupp.edu.kh</div>
            </button>
            <button
              onClick={async () => {
                await quickLoginAs('rupp_organizer');
                onClose();
              }}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-left transition-colors"
            >
              <div className="font-bold text-slate-800">Organizer</div>
              <div className="text-[10px] text-slate-400">ckcc.organizer@...</div>
            </button>
            <button
              onClick={async () => {
                await quickLoginAs('rupp_admin');
                onClose();
              }}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-left transition-colors"
            >
              <div className="font-bold text-slate-800">Univ Admin</div>
              <div className="text-[10px] text-slate-400">rupp.admin@rupp...</div>
            </button>
            <button
              onClick={async () => {
                await quickLoginAs('admin');
                onClose();
              }}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-left transition-colors"
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
