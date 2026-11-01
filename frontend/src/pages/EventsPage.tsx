import React, { useState } from 'react';
import { useLanguage } from '../i18n/context.js';
import { useAuth } from '../context/AuthContext.js';
import { Calendar, MapPin, CheckCircle2, AlertCircle, Search, Clock, Users, ArrowRight } from 'lucide-react';

interface EventsPageProps {
  events: any[];
  onSelectEvent: (eventId: number) => void;
  onNavigateToOrganizer?: () => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({ events, onSelectEvent, onNavigateToOrganizer }) => {
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'demonstration' | 'expired' | 'all'>('upcoming');
  const [search, setSearch] = useState('');

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.title_en.toLowerCase().includes(search.toLowerCase()) ||
      ev.title_km.includes(search) ||
      ev.category.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'upcoming') {
      return ev.event_verification === 'confirmed' && ev.status === 'published';
    } else if (activeTab === 'demonstration') {
      return ev.data_classification === 'demonstration';
    } else if (activeTab === 'expired') {
      return ev.event_verification === 'expired' || ev.status === 'completed';
    }

    return true; // all
  });

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{t.events.title}</h2>
          <p className="text-xs text-slate-500 mt-1">{t.events.subtitle}</p>
        </div>

        {/* Tab switchers (Scrollable on mobile, wrap on tablet/desktop) */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'upcoming' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.events.verifiedPublic}
          </button>
          <button
            onClick={() => setActiveTab('demonstration')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'demonstration' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.events.demonstration}
          </button>
          <button
            onClick={() => setActiveTab('expired')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'expired' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.events.expired}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.events.allEvents}
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.events.searchPlaceholder}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
      </div>

      {/* Events Grid or Bilingual Empty State */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {language === 'km' ? 'គ្មានព្រឹត្តិការណ៍ដែលបានផ្ទៀងផ្ទាត់នៅពេលនេះទេ' : 'No Verified Upcoming Events Found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {language === 'km'
                ? 'ព្រឹត្តិការណ៍ទាំងអស់ត្រូវបានត្រួតពិនិត្យ និងផ្ទៀងផ្ទាត់ជាមួយគេហទំព័រផ្លូវការ RUPP មុននឹងផ្សព្វផ្សាយ។ អ្នករៀបចំដែលមានសិទ្ធិអាចបន្ថែមព្រឹត្តិការណ៍បាន។'
                : 'All event listings undergo rigorous verification against official institutional announcements. Authorized organizers can manually add verified upcoming events.'}
            </p>
          </div>

          {(user?.role === 'organizer' || user?.role === 'university_admin' || user?.role === 'platform_admin') && onNavigateToOrganizer && (
            <button
              onClick={onNavigateToOrganizer}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              Add Verified Event in Portal <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((ev) => {
            const isConfirmed = ev.event_verification === 'confirmed';
            const isDemo = ev.data_classification === 'demonstration';
            const isExpired = ev.event_verification === 'expired' || new Date(ev.end_time) < new Date();
            const capacityRatio = ev.capacity > 0 ? (ev.registered_count / ev.capacity) * 100 : 0;
            const isFull = ev.registered_count >= ev.capacity;

            return (
              <div
                key={ev.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {ev.category}
                    </span>

                    {isDemo ? (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600" /> Demo Sandbox
                      </span>
                    ) : isExpired ? (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        Expired / Past
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Confirmed
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {language === 'km' ? ev.title_km : ev.title_en}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3">
                    {language === 'km' ? ev.description_km : ev.description_en}
                  </p>

                  <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {new Date(ev.start_time).toLocaleDateString()} at{' '}
                        {new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {ev.room_or_venue_details || (language === 'km' ? ev.building_name_km : ev.building_name_en) || 'RUPP Campus'}
                      </span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="pt-2">
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> Registrations
                      </span>
                      <span>
                        <strong className="text-slate-900">{ev.registered_count}</strong> / {ev.capacity}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, capacityRatio)}%` }}
                        className={`h-full ${isFull ? 'bg-rose-500' : 'bg-brand-500'}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {ev.university_acronym || 'RUPP'}
                  </span>
                  <button
                    onClick={() => onSelectEvent(ev.id)}
                    className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors"
                  >
                    {isExpired ? 'View Details' : isFull ? 'Details (Full)' : 'View & Register'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventsPage;
