import React from 'react';
import { useLanguage } from '../i18n/context.js';
import {
  Compass,
  Calendar,
  Building2,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  MapPin,
  ArrowRight,
  BookOpen,
  Award
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (tab: string) => void;
  onSelectEvent: (eventId: number) => void;
  onSelectBuilding: (buildingId: number) => void;
  events: any[];
  buildings: any[];
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onSelectEvent,
  onSelectBuilding,
  events,
  buildings,
}) => {
  const { language, t } = useLanguage();

  const confirmedUpcomingEvents = events.filter(
    (e) => e.status === 'published' && e.event_verification === 'confirmed'
  );

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-8 md:p-14 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            {t.institution.pilotTitle}: {language === 'km' ? t.institution.ruppKhmerName : t.institution.ruppFullName}
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            {t.hero.title}
          </h1>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            {t.hero.subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('campuses')}
              className="px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-lg shadow-brand-500/25 flex items-center gap-2 transition-all hover:gap-3"
            >
              <Compass className="w-4 h-4" />
              {t.hero.exploreMap}
            </button>
            <button
              onClick={() => onNavigate('events')}
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-bold backdrop-blur-sm flex items-center gap-2 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              {t.hero.viewEvents}
            </button>
          </div>

          <p className="text-[11px] text-slate-400 pt-3 border-t border-slate-800">
            {t.hero.disclaimer}
          </p>
        </div>

        {/* Decorative background grid */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none bg-[radial-gradient(#38a8f7_1px,transparent_1px)] [background-size:16px_16px]" />
      </section>

      {/* RUPP Pilot Institution Profile & Key Facts */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                {t.institution.pilotTitle}
              </span>
              <span className="bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified Public Source
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              {language === 'km' ? 'សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ (RUPP)' : 'Royal University of Phnom Penh (RUPP)'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Russian Federation Boulevard, Khan Toul Kork, Phnom Penh, Cambodia
            </p>
          </div>

          <a
            href="https://www.rupp.edu.kh/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors shrink-0"
          >
            {t.institution.visitWebsite} <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
            <span className="text-2xl font-black text-blue-900">2</span>
            <p className="text-xs font-semibold text-blue-700 mt-1">Campuses</p>
            <p className="text-[11px] text-slate-500">Campus 1 & Campus 2</p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
            <span className="text-2xl font-black text-emerald-900">{buildings.length}</span>
            <p className="text-xs font-semibold text-emerald-700 mt-1">Buildings & Centers</p>
            <p className="text-[11px] text-slate-500">CJCC, CKCC, IFL, Library, STEM</p>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100">
            <span className="text-2xl font-black text-purple-900">{confirmedUpcomingEvents.length}</span>
            <p className="text-xs font-semibold text-purple-700 mt-1">Upcoming Events</p>
            <p className="text-[11px] text-slate-500">Official RUPP / CJCC gatherings</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
            <span className="text-2xl font-black text-amber-900">100%</span>
            <p className="text-xs font-semibold text-amber-700 mt-1">Verifiable Coordinates</p>
            <p className="text-[11px] text-slate-500">OpenStreetMap GPS verified</p>
          </div>
        </div>
      </section>

      {/* Featured Verified Campus Buildings */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {language === 'km' ? 'អគារ និងមជ្ឈមណ្ឌលសំខាន់ៗ' : 'Verified Campus Facilities'}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'km'
                ? 'ទីតាំងដែលបានផ្ទៀងផ្ទាត់លើ OpenStreetMap'
                : 'Facilities mapped with verified OpenStreetMap geographic coordinates.'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('campuses')}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            View Map <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {buildings.slice(0, 3).map((b) => (
            <div
              key={b.id}
              onClick={() => {
                onSelectBuilding(b.id);
                onNavigate('campuses');
              }}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-brand-400 hover:shadow-md cursor-pointer transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {b.code}
                </span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 leading-snug">
                {language === 'km' ? b.name_km : b.name_en}
              </h4>
              <p className="text-xs text-slate-500 line-clamp-2">
                {language === 'km' ? b.description_km : b.description_en}
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-brand-600 font-semibold">
                <span>View on Map</span>
                <Compass className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Upcoming Events */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {language === 'km' ? 'ព្រឹត្តិការណ៍ផ្លូវការខាងមុខ' : 'Confirmed Upcoming Events'}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'km'
                ? 'ព្រឹត្តិការណ៍ដែលបានផ្ទៀងផ្ទាត់ពីគេហទំព័រ RUPP & CJCC'
                : 'Verifiable events published by official institution coordinators.'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('events')}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            All Events <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {confirmedUpcomingEvents.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-sm font-semibold text-slate-700">{t.events.noEventsFound}</p>
            <p className="text-xs text-slate-500 mt-1">{t.events.noEventsSubtext}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {confirmedUpcomingEvents.slice(0, 2).map((ev) => (
              <div
                key={ev.id}
                className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full">
                      {ev.category}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {t.common.confirmed}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 leading-snug">
                    {language === 'km' ? ev.title_km : ev.title_en}
                  </h4>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {language === 'km' ? ev.description_km : ev.description_en}
                  </p>

                  <div className="space-y-1.5 pt-2 text-xs text-slate-500 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(ev.start_time).toLocaleDateString()} — {new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ev.room_or_venue_details || (language === 'km' ? ev.building_name_km : ev.building_name_en)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Capacity: <strong className="text-slate-800">{ev.registered_count}</strong> / {ev.capacity}
                  </span>
                  <button
                    onClick={() => onSelectEvent(ev.id)}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors"
                  >
                    View & Register
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
