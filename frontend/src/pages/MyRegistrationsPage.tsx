import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/context.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Compass,
  ArrowRight,
  ShieldCheck,
  Building2
} from 'lucide-react';

interface MyRegistrationsPageProps {
  onSelectEvent: (eventId: number) => void;
  onNavigateToMap?: (campusId: number, buildingId?: number) => void;
}

export const MyRegistrationsPage: React.FC<MyRegistrationsPageProps> = ({
  onSelectEvent,
  onNavigateToMap,
}) => {
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/me/registrations');
      if (res.data?.success) {
        setRegistrations(res.data.data);
        localStorage.setItem('campusconnect_user_registrations', JSON.stringify(res.data.data));
        return;
      }
    } catch (err: any) {
      console.warn('API fetch failed, reading registrations from local cache:', err);
      const local = localStorage.getItem('campusconnect_user_registrations');
      if (local) {
        try {
          setRegistrations(JSON.parse(local));
          return;
        } catch (e) {
          // ignore
        }
      }
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const handleCancel = async (eventId: number) => {
    if (!window.confirm(
      language === 'km'
        ? 'តើអ្នកប្រាកដថាចង់លុបចោលការចុះឈ្មោះសម្រាប់ព្រឹត្តិការណ៍នេះមែនទេ?'
        : 'Are you sure you want to cancel your registration for this event?'
    )) {
      return;
    }

    try {
      setCancellingId(eventId);
      await api.delete(`/events/${eventId}/registrations/me`);
      await fetchRegistrations();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Cancellation failed. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const filtered = registrations.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.registration_status === statusFilter;
  });

  const activeCount = registrations.filter((r) => r.registration_status === 'confirmed').length;

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900">
              {t.nav.myRegistrations}
            </h2>
            <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-500" />
              {activeCount} {language === 'km' ? 'សកម្ម' : 'Active'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'km'
              ? 'គ្រប់គ្រងការកក់ទុក និងការចុះឈ្មោះចូលរួមព្រឹត្តិការណ៍ក្នុងសាកលវិទ្យាល័យរបស់អ្នក'
              : 'Manage your active campus event bookings, schedules, and verified venues.'}
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-bold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {language === 'km' ? 'ទាំងអស់' : 'All'} ({registrations.length})
          </button>
          <button
            onClick={() => setStatusFilter('confirmed')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'confirmed'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-emerald-700'
            }`}
          >
            {language === 'km' ? 'បានបញ្ជាក់' : 'Confirmed'} ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'cancelled'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-500 hover:text-rose-700'
            }`}
          >
            {language === 'km' ? 'បានលុបចោល' : 'Cancelled'} ({registrations.length - activeCount})
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 text-xs bg-white rounded-3xl border border-slate-200">
          <div className="animate-spin w-7 h-7 border-3 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
          {t.common.loading}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">
            {language === 'km' ? 'មិនមានការចុះឈ្មោះទេ' : 'No Registrations Found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {language === 'km'
              ? 'អ្នកមិនទាន់បានចុះឈ្មោះសម្រាប់ព្រឹត្តិការណ៍ណាមួយនៅឡើយទេ។ សូមពិនិត្យមើលបញ្ជីព្រឹត្តិការណ៍សាកលវិទ្យាល័យ។'
              : 'You have not registered for any events yet. Explore upcoming campus events to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((reg) => {
            const isConfirmed = reg.registration_status === 'confirmed';
            const startDate = new Date(reg.start_time).toLocaleString(
              language === 'km' ? 'km-KH' : 'en-US',
              {
                timeZone: 'Asia/Phnom_Penh',
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }
            );

            const hasGps = reg.latitude && reg.longitude;
            const directionsUrl = hasGps
              ? `https://www.google.com/maps/dir/?api=1&destination=${reg.latitude},${reg.longitude}`
              : null;

            return (
              <div
                key={reg.registration_id}
                className={`bg-white rounded-3xl border transition-all p-5 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md ${
                  isConfirmed ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 bg-slate-50/50 opacity-75'
                }`}
              >
                <div className="space-y-3">
                  {/* Status header */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                      {reg.category}
                    </span>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        isConfirmed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {isConfirmed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          {language === 'km' ? 'បានបញ្ជាក់' : 'Confirmed'}
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          {language === 'km' ? 'បានលុបចោល' : 'Cancelled'}
                        </>
                      )}
                    </span>
                  </div>

                  {/* Title */}
                  <div>
                    <h3
                      onClick={() => onSelectEvent(reg.event_id)}
                      className="text-base font-extrabold text-slate-900 leading-snug cursor-pointer hover:text-brand-600 transition-colors"
                    >
                      {language === 'km' ? reg.title_km : reg.title_en}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {language === 'km' ? reg.title_en : reg.title_km}
                    </p>
                  </div>

                  {/* Date & Time */}
                  <div className="text-xs text-slate-600 space-y-1.5 pt-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-500 shrink-0" />
                      <span className="font-medium">{startDate} (Phnom Penh)</span>
                    </div>

                    {/* Venue & Campus */}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-800">
                          {language === 'km' ? reg.building_name_km : reg.building_name_en || reg.room_or_venue_details || 'Campus Venue'}
                        </span>
                        <div className="text-[11px] text-slate-500">
                          {language === 'km' ? reg.campus_name_km : reg.campus_name_en} • {reg.university_acronym || 'RUPP'}
                        </div>
                      </div>
                    </div>

                    {/* Verification pill */}
                    {reg.event_verification === 'verified' && (
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md mt-1">
                        <ShieldCheck className="w-3 h-3 text-blue-600" />
                        {language === 'km' ? 'ព្រឹត្តិការណ៍ផ្លូវការដែលបានផ្ទៀងផ្ទាត់' : 'Verified Official Event'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectEvent(reg.event_id)}
                      className="text-brand-600 hover:text-brand-800 font-bold flex items-center gap-1"
                    >
                      {language === 'km' ? 'មើលព័ត៌មានលម្អិត' : 'View Details'}
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    {hasGps && onNavigateToMap && (
                      <button
                        onClick={() => onNavigateToMap(1, reg.building_id)}
                        className="text-slate-500 hover:text-slate-700 font-semibold flex items-center gap-1"
                      >
                        <Compass className="w-3 h-3" />
                        {language === 'km' ? 'ផែនទី' : 'Map'}
                      </button>
                    )}

                    {directionsUrl && (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-slate-600 flex items-center gap-0.5 text-[11px]"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  {isConfirmed && (
                    <button
                      disabled={cancellingId === reg.event_id}
                      onClick={() => handleCancel(reg.event_id)}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {cancellingId === reg.event_id
                        ? (language === 'km' ? 'កំពុងលុប...' : 'Cancelling...')
                        : (language === 'km' ? 'លុបចោលការចុះឈ្មោះ' : 'Cancel Booking')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyRegistrationsPage;
