import React, { useState } from 'react';
import { useLanguage } from '../i18n/context.js';
import { useAuth } from '../context/AuthContext.js';
import UniversityDropdown from './UniversityDropdown.js';
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
  GraduationCap,
  Key,
  Menu,
  X
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenAuthModal: () => void;
  onOpenProfileModal?: () => void;
  selectedUniversityId: number;
  onSelectUniversity: (id: number) => void;
  universities: any[];
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenAuthModal,
  onOpenProfileModal,
  selectedUniversityId,
  onSelectUniversity,
  universities,
}) => {
  const { language, toggleLanguage, t } = useLanguage();
  const { user, logout, quickLoginAs } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isTestPersonaOpen, setIsTestPersonaOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core navigation items ( हमेशा 4 permanent sections in desktop navbar to prevent horizontal overflow )
  const coreNavItems = [
    {
      id: 'campuses',
      label: t.nav.campusMap,
      shortLabel: language === 'km' ? 'ផែនទី' : 'Map',
      icon: MapPin,
    },
    {
      id: 'facilities',
      label: t.nav.facilities,
      shortLabel: language === 'km' ? 'អគារ' : 'Facilities',
      icon: Building2,
    },
    {
      id: 'events',
      label: t.nav.campusEvents,
      shortLabel: language === 'km' ? 'ព្រឹត្តិការណ៍' : 'Events',
      icon: Calendar,
    },
    {
      id: 'universities',
      label: t.nav.universities,
      shortLabel: language === 'km' ? 'គ្រឹះស្ថាន' : 'Unis',
      icon: GraduationCap,
    },
  ];

  // Mobile drawer includes all links including personal dashboards
  const mobileNavItems = [...coreNavItems];
  if (user) {
    if (user.role === 'student') {
      mobileNavItems.push({
        id: 'student',
        label: t.nav.studentDashboard,
        shortLabel: 'Student',
        icon: User,
      });
      mobileNavItems.push({
        id: 'my-registrations',
        label: t.nav.myRegistrations,
        shortLabel: 'Registrations',
        icon: ClipboardList,
      });
    } else if (user.role === 'organizer') {
      mobileNavItems.push({
        id: 'organizer',
        label: t.nav.organizerDashboard,
        shortLabel: 'Organizer',
        icon: Calendar,
      });
    } else if (user.role === 'university_admin' || user.role === 'platform_admin') {
      mobileNavItems.push({
        id: 'admin',
        label: t.nav.adminDashboard,
        shortLabel: 'Admin',
        icon: Shield,
      });
    }
  }

  const selectedUni = universities.find((u) => u.id === selectedUniversityId) || universities[0];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs w-full max-w-full overflow-hidden">
      {/* Top institution pilot banner (responsive text & truncation for all phones) */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white text-[10px] sm:text-[11px] py-1 sm:py-1.5 px-2 sm:px-4 text-center font-medium flex items-center justify-center gap-1.5 sm:gap-2 overflow-hidden w-full">
        <span className="bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] tracking-wide uppercase shrink-0">
          {selectedUni?.acronym === 'RUPP' ? 'RUPP Pilot V2.0' : `${selectedUni?.acronym || 'CC'} V2.0`}
        </span>
        <span className="truncate max-w-[80vw] sm:max-w-none">
          {selectedUni
            ? language === 'km'
              ? `${selectedUni.name_km} (${selectedUni.name_en})`
              : `${selectedUni.name_en} (${selectedUni.name_km})`
            : 'Royal University of Phnom Penh'}{' '}
          — Multi-Institution Platform
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 w-full overflow-hidden">
        <div className="flex items-center justify-between h-16 gap-1 sm:gap-2 xl:gap-3 w-full">
          {/* Brand Logo & University Selector Group */}
          <div className="flex items-center gap-1 sm:gap-2 xl:gap-3 shrink-0 min-w-0">
            <div
              onClick={() => {
                setCurrentTab('campuses');
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group shrink-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 xl:w-10 xl:h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white flex items-center justify-center font-black text-sm sm:text-base xl:text-lg shadow-md group-hover:scale-105 transition-transform shrink-0">
                CC
              </div>
              <div className="hidden sm:block">
                <div className="font-extrabold text-sm xl:text-base tracking-tight text-slate-900 flex items-center gap-1">
                  <span>CampusConnect</span>
                  <span className="text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200 px-1 py-0.2 rounded">
                    v2.0
                  </span>
                </div>
                <p className="hidden 2xl:block text-[9px] text-slate-400 font-medium">Khmer-English Platform</p>
              </div>
            </div>

            {/* University Selector Dropdown - Visible on iPhone, iPad & Desktop */}
            <div className="shrink-0">
              <UniversityDropdown
                universities={universities}
                selectedUniversityId={selectedUniversityId}
                onSelectUniversity={onSelectUniversity}
              />
            </div>
          </div>

          {/* Core Navigation Links (Desktop lg+) - Fits without overflowing on 1024px-1366px */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 shrink-0">
            {coreNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-1.5 px-2 xl:px-3 py-1.5 xl:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                  <span className="hidden xl:inline">{item.label}</span>
                  <span className="xl:hidden">{item.shortLabel}</span>
                </button>
              );
            })}

            {/* Student quick pill on wide screens (>= 1280px) */}
            {user?.role === 'student' && (
              <button
                onClick={() => setCurrentTab('student')}
                className={`hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  currentTab === 'student'
                    ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{language === 'km' ? 'គណនីនិស្សិត' : 'Student'}</span>
              </button>
            )}
          </nav>

          {/* Right Actions: Language Switcher, Personas & User Profile */}
          <div className="flex items-center gap-1 sm:gap-1.5 xl:gap-2 shrink-0">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              data-testid="language-toggle-btn"
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition-colors shrink-0"
              title="Switch Language / ប្តូរភាសា"
            >
              <Globe className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span className="hidden xl:inline">{language === 'en' ? 'ភាសាខ្មែរ' : 'English'}</span>
              <span className="xl:hidden font-bold uppercase text-[11px]">{language === 'en' ? 'ខ្មែរ' : 'EN'}</span>
            </button>

            {/* Quick Test Persona Switcher (Compact on laptop, full on 2xl) */}
            <div className="relative hidden sm:block shrink-0">
              <button
                onClick={() => setIsTestPersonaOpen(!isTestPersonaOpen)}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-xs font-semibold text-amber-900 transition-colors shrink-0"
                title="Switch test persona for evaluator testing"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden xl:inline">Personas</span>
                <ChevronDown className="w-3 h-3 text-amber-500 shrink-0" />
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
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`flex items-center gap-1.5 pl-1.5 pr-2 py-1.5 rounded-xl border transition-colors shrink-0 ${
                    currentTab === 'student' || currentTab === 'my-registrations' || currentTab === 'organizer' || currentTab === 'admin'
                      ? 'bg-blue-50 border-blue-200 text-blue-900 ring-1 ring-blue-100'
                      : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  <div className="w-6 h-6 rounded-lg bg-brand-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {user.fullName.charAt(0)}
                  </div>
                  <span className="text-xs font-bold hidden xl:inline max-w-[100px] truncate">
                    {user.fullName}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-xs">
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <div className="font-bold text-slate-900 truncate">{user.fullName}</div>
                      <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200 font-mono">
                        {user.role}
                      </span>
                    </div>

                    {/* Quick navigation for personal dashboards */}
                    {user.role === 'student' && (
                      <>
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setCurrentTab('student');
                          }}
                          className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 font-bold ${
                            currentTab === 'student' ? 'text-brand-600 bg-brand-50/50' : 'text-slate-700'
                          }`}
                        >
                          <User className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                          <span>{t.nav.studentDashboard}</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setCurrentTab('my-registrations');
                          }}
                          className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 font-bold ${
                            currentTab === 'my-registrations' ? 'text-brand-600 bg-brand-50/50' : 'text-slate-700'
                          }`}
                        >
                          <ClipboardList className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                          <span>{t.nav.myRegistrations}</span>
                        </button>
                      </>
                    )}

                    {user.role === 'organizer' && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setCurrentTab('organizer');
                        }}
                        className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 font-bold ${
                          currentTab === 'organizer' ? 'text-brand-600 bg-brand-50/50' : 'text-slate-700'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>{t.nav.organizerDashboard}</span>
                      </button>
                    )}

                    {(user.role === 'university_admin' || user.role === 'platform_admin') && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setCurrentTab('admin');
                        }}
                        className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 font-bold ${
                          currentTab === 'admin' ? 'text-brand-600 bg-brand-50/50' : 'text-slate-700'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{t.nav.adminDashboard}</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenProfileModal?.();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-semibold border-t border-slate-100"
                    >
                      <Key className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {t.auth.profileTitle}
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setIsUserMenuOpen(false);
                        setCurrentTab('campuses');
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-semibold border-t border-slate-100"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      {t.nav.logout}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
              >
                {t.nav.login}
              </button>
            )}

            {/* Mobile Menu Hamburger Toggle (visible on < lg) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 bg-white transition-colors cursor-pointer shrink-0"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4 text-slate-900" /> : <Menu className="w-4 h-4 text-slate-900" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu (Visible on Mobile & Tablet when opened) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-3 shadow-xl animate-in fade-in slide-in-from-top-2 max-h-[85vh] overflow-y-auto">
          {/* Navigation Links */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
              {language === 'km' ? 'ម៉ឺនុយរុករក' : 'Navigation Menu'}
            </div>
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-extrabold ring-1 ring-brand-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Test Personas Quick Switch */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Test Accounts (Personas)</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={async () => {
                  await quickLoginAs('student');
                  setIsMobileMenuOpen(false);
                  setCurrentTab('student');
                }}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-left text-[11px] font-bold text-slate-800 border border-slate-200"
              >
                🎓 Student
              </button>
              <button
                onClick={async () => {
                  await quickLoginAs('rupp_organizer');
                  setIsMobileMenuOpen(false);
                  setCurrentTab('organizer');
                }}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-left text-[11px] font-bold text-slate-800 border border-slate-200"
              >
                📋 Organizer
              </button>
              <button
                onClick={async () => {
                  await quickLoginAs('rupp_admin');
                  setIsMobileMenuOpen(false);
                  setCurrentTab('admin');
                }}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-left text-[11px] font-bold text-slate-800 border border-slate-200"
              >
                🏛️ Univ Admin
              </button>
              <button
                onClick={async () => {
                  await quickLoginAs('admin');
                  setIsMobileMenuOpen(false);
                  setCurrentTab('admin');
                }}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-left text-[11px] font-bold text-slate-800 border border-slate-200"
              >
                ⚡ Platform Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
