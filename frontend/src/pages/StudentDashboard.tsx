import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/context.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { Calendar, Clock, MapPin, CheckCircle2, AlertCircle, XCircle, Bell, User, Heart } from 'lucide-react';

export const StudentDashboard: React.FC<{ onSelectEvent: (id: number) => void }> = ({ onSelectEvent }) => {
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboards/student');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCancelRegistration = async (eventId: number) => {
    if (!confirm('Are you sure you want to cancel your registration?')) return;
    try {
      setActionLoading(true);
      await api.post(`/events/${eventId}/cancel`);
      await fetchDashboard();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Cancellation failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-16 text-center text-slate-500 text-xs">{t.common.loading}</div>;
  }

  const activeRegistrations = data?.registrations.filter((r: any) => r.registration_status === 'confirmed') || [];

  return (
    <div className="space-y-8 pb-20">
      {/* Student Profile Overview */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xl shadow-inner">
            {user?.fullName?.charAt(0) || 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{user?.fullName}</h2>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full uppercase">
                Student
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {user?.email} — {user?.universityNameEn || 'Royal University of Phnom Penh (RUPP)'}
            </p>
          </div>
        </div>

        <div className="flex gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 text-xs">
          <div>
            <span className="text-2xl font-black text-slate-900">{activeRegistrations.length}</span>
            <p className="text-[11px] text-slate-400 font-medium">Active Bookings</p>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900">{data?.favorites?.length || 0}</span>
            <p className="text-[11px] text-slate-400 font-medium">Favorites</p>
          </div>
        </div>
      </div>

      {/* Registered Events Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-brand-600" />
          {t.dashboard.registeredEvents}
        </h3>

        {activeRegistrations.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-200">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">{t.dashboard.noRegistrations}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeRegistrations.map((reg: any) => (
              <div
                key={reg.registration_id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                      {reg.category}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Confirmed
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 leading-snug">
                    {language === 'km' ? reg.title_km : reg.title_en}
                  </h4>

                  <div className="space-y-1 text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(reg.start_time).toLocaleDateString()} at {new Date(reg.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{reg.room_or_venue_details || reg.building_name_en}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => onSelectEvent(reg.event_id)}
                    className="text-brand-600 font-bold hover:underline"
                  >
                    View Details
                  </button>

                  <button
                    onClick={() => handleCancelRegistration(reg.event_id)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                  >
                    Cancel Booking
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notifications Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" /> Notifications
        </h3>

        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
          {data?.notifications?.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">No notifications at this time.</div>
          ) : (
            data?.notifications.map((n: any) => (
              <div key={n.id} className="p-4 flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <h5 className="font-bold text-slate-900">{language === 'km' ? n.title_km : n.title_en}</h5>
                  <p className="text-slate-600 mt-0.5">{language === 'km' ? n.message_km : n.message_en}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default StudentDashboard;
