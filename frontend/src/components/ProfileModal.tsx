import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/context.js';
import { useAuth } from '../context/AuthContext.js';
import { X, User, KeyRound, CheckCircle2, AlertCircle, Shield, Building2 } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { language, t } = useLanguage();
  const { user, updateProfile, changePassword } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profile Form state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [fullNameKm, setFullNameKm] = useState(user?.fullNameKm || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setFullNameKm(user.fullNameKm || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setProfileLoading(true);

    try {
      await updateProfile({
        fullName: fullName.trim(),
        fullNameKm: fullNameKm.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err: any) {
      setProfileError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError(t.auth.passwordsDoNotMatch);
      return;
    }

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError(t.auth.passwordStrengthNotice);
      return;
    }

    setPasswordLoading(true);

    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 transition-colors"
          title={t.common.close}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg border border-brand-200">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">{t.auth.profileTitle}</h3>
            <p className="text-xs text-slate-500 font-medium">{user.email}</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-4 flex items-center gap-1.5 transition-colors ${
              activeTab === 'profile'
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            {t.auth.editProfile}
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`pb-2.5 px-4 flex items-center gap-1.5 transition-colors ${
              activeTab === 'password'
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            {t.auth.changePassword}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            {profileSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t.auth.profileUpdated}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {/* Read-only account overview */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Account Role</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 uppercase tracking-wider font-mono">
                  {user.role}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Institution</span>
                <span className="text-slate-800 font-bold truncate max-w-[220px]">
                  {language === 'km' ? user.universityNameKm : user.universityNameEn} ({user.universityAcronym || 'RUPP'})
                </span>
              </div>
              {user.studentIdNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Student ID</span>
                  <span className="font-mono text-slate-800 font-bold">{user.studentIdNumber}</span>
                </div>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-700">{t.auth.fullName} *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">{t.auth.fullNameKm}</label>
              <input
                type="text"
                value={fullNameKm}
                onChange={(e) => setFullNameKm(e.target.value)}
                className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">{t.auth.phone}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={profileLoading}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-xs transition-colors text-xs"
              >
                {profileLoading ? 'Saving...' : t.common.save}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t.auth.passwordChanged}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700">{t.auth.currentPassword} *</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">{t.auth.newPassword} *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">{t.auth.passwordStrengthNotice}</p>
            </div>

            <div>
              <label className="font-semibold text-slate-700">{t.auth.confirmNewPassword} *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-xs transition-colors text-xs"
              >
                {passwordLoading ? 'Updating...' : t.auth.changePassword}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
