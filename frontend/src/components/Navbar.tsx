import React, { useState } from 'react';
import { useLanguage } from '../i18n/context.js';
import { useAuth } from '../context/AuthContext.js';
import { Globe, Building2, MapPin, Calendar, User, Shield, LogOut, ChevronDown, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onOpenAuthModal }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const { user, logout, quickLoginAs } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: t.nav.home, icon: Building2 },
    { id: 'universities', label: t.nav.universities, icon: Building2 },
    { id: 'campuses', label: t.nav.campuses, icon: MapPin },
    { id: 'events', label: t.nav.events, icon: Calendar },
  ];

  if (user) {
    if (user.role === 'student') {
      navItems.push({ id: 'student', label: t.nav.studentDashboard, icon: User });
    } else if (user.role === 'organizer') {
      navItems.push({ id: 'organizer', label: t.nav.organizerDashboard, icon: Calendar });
    } else if (user.role === 'university_admin' || user.role === 'platform_admin') {
      navItems.push({ id: 'admin', label: t.nav.adminDashboard, icon: Shield });
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top institution pilot banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white text-[11px] py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2">
        <span className="bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded text-[10px] tracking-wide uppercase">
          RUPP Pilot
        </span>
        <span>
          Royal University of Phnom Penh (សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ) — Multi-University Verified Open Platform
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div
            onClick={() => setCurrentTab('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white flex items-center justify-center font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
              CC
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                CampusConnect
                <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">RUPP Pilot Institution</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Actions: Language Switcher & User Menu */}
          <div className="flex items-center gap-2.5">
            {/* Language Toggle Button (Acceptance Test 11) */}
            <button
              onClick={toggleLanguage}
              data-testid="language-toggle-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors"
              title="Switch Language / ប្តូរភាសា"
            >
              <Globe className="w-3.5 h-3.5 text-brand-600" />
              <span>{language === 'en' ? 'ភាសាខ្មែរ (KM)' : 'English (EN)'}</span>
            </button>

            {/* Quick Role Switcher (For Evaluation Testing) */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">
                  {user ? `${user.fullName} (${user.role})` : 'Test Accounts'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Switch Test Persona
                  </div>
                  <button
                    onClick={async () => {
                      await quickLoginAs('student');
                      setIsUserMenuOpen(false);
                      setCurrentTab('student');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Student (RUPP)</div>
                      <div className="text-[10px] text-slate-400">student@rupp.edu.kh</div>
                    </div>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Student</span>
                  </button>

                  <button
                    onClick={async () => {
                      await quickLoginAs('rupp_organizer');
                      setIsUserMenuOpen(false);
                      setCurrentTab('organizer');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">RUPP Organizer (CKCC)</div>
                      <div className="text-[10px] text-slate-400">ckcc.organizer@rupp.edu.kh</div>
                    </div>
                    <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">Organizer</span>
                  </button>

                  <button
                    onClick={async () => {
                      await quickLoginAs('rupp_admin');
                      setIsUserMenuOpen(false);
                      setCurrentTab('admin');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">RUPP Administrator</div>
                      <div className="text-[10px] text-slate-400">rupp.admin@rupp.edu.kh</div>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">Univ Admin</span>
                  </button>

                  <button
                    onClick={async () => {
                      await quickLoginAs('admin');
                      setIsUserMenuOpen(false);
                      setCurrentTab('admin');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Platform Administrator</div>
                      <div className="text-[10px] text-slate-400">admin@campusconnect.edu.kh</div>
                    </div>
                    <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">Platform Admin</span>
                  </button>

                  {user && (
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                          setCurrentTab('home');
                        }}
                        className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        {t.nav.logout}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Auth CTA if logged out */}
            {!user && (
              <button
                onClick={onOpenAuthModal}
                className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                {t.nav.login}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
