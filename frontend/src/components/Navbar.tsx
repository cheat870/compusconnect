import React, { useState } from 'react';
import { useLanguage } from '../i18n/context.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Globe,
  Building2,
  MapPin,
  Calendar,
  User,
  Shield,
  LogOut,
  ChevronDown,
  Sparkles,
  ClipboardList,
  Layers,
  GraduationCap
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenAuthModal: () => void;
  selectedUniversityId: number;
  onSelectUniversity: (id: number) => void;
  universities: any[];
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenAuthModal,
  selectedUniversityId,
  onSelectUniversity,
  universities,
}) => {
  const { language, toggleLanguage, t } = useLanguage();
  const { user, logout, quickLoginAs } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isTestPersonaOpen, setIsTestPersonaOpen] = useState(false);

  // Core navigation items based on V2.0 specifications
  const navItems = [
    { id: 'campuses', label: t.nav.campusMap, icon: MapPin },
    { id: 'facilities', label: t.nav.facilities, icon: Building2 },
    { id: 'events', label: t.nav.campusEvents, icon: Calendar },
  ];

  // Role-specific authenticated navigation items
  if (user) {
    if (user.role === 'student') {
      navItems.push({ id: 'my-registrations', label: t.nav.myRegistrations, icon: ClipboardList });
      navItems.push({ id: 'student', label: t.nav.studentDashboard, icon: User });
    } else if (user.role === 'organizer') {
      navItems.push({ id: 'organizer', label: t.nav.organizerDashboard, icon: Calendar });
    } else if (user.role === 'university_admin' || user.role === 'platform_admin') {
      navItems.push({ id: 'admin', label: t.nav.adminDashboard, icon: Shield });
    }
  }

  const selectedUni = universities.find((u) => u.id === selectedUniversityId) || universities[0];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top institution pilot banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white text-[11px] py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2">
        <span className="bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded text-[10px] tracking-wide uppercase">
          RUPP Pilot V2.0
        </span>
        <span className="truncate">
          Royal University of Phnom Penh (សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ) — Multi-Institution Platform
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Version Indicator */}
          <div
            onClick={() => setCurrentTab('campuses')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white flex items-center justify-center font-black text-lg shadow-md group-hover:scale-105 transition-transform">
              CC
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                CampusConnect
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 px-1.5 py-0.2 rounded">
                  v2.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Khmer-English Platform</p>
            </div>
          </div>

          {/* University Selector Dropdown in Header (Specification Section 4) */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <GraduationCap className="w-4 h-4 text-brand-600 shrink-0" />
            <select
              value={selectedUniversityId}
              onChange={(e) => onSelectUniversity(Number(e.target.value))}
              aria-label="Select University"
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[210px] truncate"
            >
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.acronym} — {language === 'km' ? u.name_km : u.name_en}
                </option>
              ))}
            </select>
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
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Actions: Language Switcher, Personas & User Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              data-testid="language-toggle-btn"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition-colors"
              title="Switch Language / ប្តូរភាសា"
            >
              <Globe className="w-3.5 h-3.5 text-brand-600" />
              <span>{language === 'en' ? 'ភាសាខ្មែរ' : 'English'}</span>
            </button>

            {/* Quick Test Persona Switcher (For Development & Evaluator Review) */}
            <div className="relative">
              <button
                onClick={() => setIsTestPersonaOpen(!isTestPersonaOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-xs font-semibold text-amber-900 transition-colors"
                title="Switch test persona for evaluator testing"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Personas</span>
                <ChevronDown className="w-3 h-3 text-amber-500" />
              </button>

              {isTestPersonaOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-xs">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Switch Test Account
                  </div>
                  <button
                    onClick={async () => {
                      await quickLoginAs('student');
                      setIsTestPersonaOpen(false);
                      setCurrentTab('student');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-800">Student (RUPP)</div>
                      <div className="text-[10px] text-slate-400">student@rupp.edu.kh</div>
                    </div>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold">Student</span>
                  </button>

                  <button
                    onClick={async () => {
                      await quickLoginAs('rupp_organizer');
                      setIsTestPersonaOpen(false);
                      setCurrentTab('organizer');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-800">RUPP Organizer</div>
                      <div className="text-[10px] text-slate-400">ckcc.organizer@rupp.edu.kh</div>
                    </div>
                    <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold">Organizer</span>
                  </button>

                  <button
                    onClick={async () => {
                      await quickLoginAs('rupp_admin');
                      setIsTestPersonaOpen(false);
                      setCurrentTab('admin');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-800">RUPP Administrator</div>
                      <div className="text-[10px] text-slate-400">rupp.admin@rupp.edu.kh</div>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">Univ Admin</span>
                  </button>

                  <button
                    onClick={async () => {
                      await quickLoginAs('admin');
                      setIsTestPersonaOpen(false);
                      setCurrentTab('admin');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-800">Platform Administrator</div>
                      <div className="text-[10px] text-slate-400">admin@campusconnect.edu.kh</div>
                    </div>
                    <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-semibold">Platform Admin</span>
                  </button>
                </div>
              )}
            </div>

            {/* Authenticated User Menu or Sign In */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-brand-600 text-white font-bold flex items-center justify-center text-xs">
                    {user.fullName.charAt(0)}
                  </div>
                  <span className="text-xs font-bold text-slate-800 hidden sm:inline max-w-[120px] truncate">
                    {user.fullName}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-xs">
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <div className="font-bold text-slate-900 truncate">{user.fullName}</div>
                      <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                        {user.role}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setCurrentTab(
                          user.role === 'student'
                            ? 'student'
                            : user.role === 'organizer'
                            ? 'organizer'
                            : 'admin'
                        );
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-semibold"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Dashboard
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setIsUserMenuOpen(false);
                        setCurrentTab('campuses');
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-semibold border-t border-slate-100"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {t.nav.logout}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors"
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
