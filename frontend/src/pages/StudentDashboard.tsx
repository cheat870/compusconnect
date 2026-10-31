import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/context.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { Calendar, Clock, MapPin, CheckCircle2, Bell } from 'lucide-react';

interface StudentDashboardProps {
  onSelectEvent: (id: number) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onSelectEvent }) => {
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const [data, setData] = useState<{
    user?: any;
    registrations: any[];
    favorites: any[];
    notifications: any[];
    stats: {
      totalRegistered: number;
      upcomingEvents: number;
      completedEvents: number;
    };
  }>({
    registrations: [],
    favorites: [],
    notifications: [
      {
        id: 1,
        title_en: 'Welcome to CampusConnect Student Portal',
        title_km: 'សូមស្វាគមន៍មកកាន់គណនីនិស្សិត CampusConnect',
        message_en: 'You can now explore campus buildings, register for RUPP events, and track navigation routes.',
        message_km: 'អ្នកអាចស្វែងរកទីតាំងអគារសិក្សា ចុះឈ្មោះចូលរួមព្រឹត្តិការណ៍ RUPP និងមើលទិសដៅផ្លូវធ្វើដំណើរបានយ៉ាងងាយស្រួល។',
        created_at: new Date().toISOString(),
      },
    ],
    stats: {
      totalRegistered: 0,
      upcomingEvents: 0,
      completedEvents: 0,
    },
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    let loadedData = false;

    try {
      const res = await api.get('/dashboards/student');
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setData({
          user: d.user || user,
          registrations: Array.isArray(d.registrations) ? d.registrations : [],
          favorites: Array.isArray(d.favorites) ? d.favorites : [],
          notifications: Array.isArray(d.notifications) && d.notifications.length > 0 ? d.notifications : [
            {
              id: 1,
              title_en: 'Welcome to CampusConnect Student Portal',
              title_km: 'សូមស្វាគមន៍មកកាន់គណនីនិស្សិត CampusConnect',
              message_en: 'You can now explore campus buildings, register for RUPP events, and track navigation routes.',
              message_km: 'អ្នកអាចស្វែងរកទីតាំងអគារសិក្សា ចុះឈ្មោះចូលរួមព្រឹត្តិការណ៍ RUPP និងមើលទិសដៅផ្លូវធ្វើដំណើរបានយ៉ាងងាយស្រួល។',
              created_at: new Date().toISOString(),
            },
          ],
          stats: d.stats || {
            totalRegistered: (d.registrations || []).length,
            upcomingEvents: (d.registrations || []).filter((r: any) => r.registration_status === 'confirmed').length,
            completedEvents: 0,
          },
        });
        loadedData = true;
      }
    } catch (err) {
      console.warn('API fetch failed, reading student dashboard from local data:', err);
    }

    if (!loadedData) {
      const local = localStorage.getItem('campusconnect_user_registrations');
      let regs: any[] = [];
      try {
        regs = local ? JSON.parse(local) : [];
      } catch {
        regs = [];
      }
      setData({
        user,
        registrations: regs,
        favorites: [],
        notifications: [
          {
            id: 1,
            title_en: 'Welcome to CampusConnect Student Portal',
            title_km: 'សូមស្វាគមន៍មកកាន់គណនីនិស្សិត CampusConnect',
            message_en: 'You can now explore campus buildings, register for RUPP events, and track navigation routes.',
            message_km: 'អ្នកអាចស្វែងរកទីតាំងអគារសិក្សា ចុះឈ្មោះចូលរួមព្រឹត្តិការណ៍ RUPP និងមើលទិសដៅផ្លូវធ្វើដំណើរបានយ៉ាងងាយស្រួល។',
            created_at: new Date().toISOString(),
          },
        ],
        stats: {
          totalRegistered: regs.length,
          upcomingEvents: regs.filter((r: any) => r.registration_status === 'confirmed').length,
          completedEvents: 0,
        },
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCancelRegistration = async (eventId: number) => {
    if (!confirm(language === 'km' ? 'តើអ្នកប្រាកដថាចង់លុបចោលការចុះឈ្មោះនេះមែនទេ?' : 'Are you sure you want to cancel your registration?')) return;
    try {
      setActionLoading(true);
      await api.post(`/events/${eventId}/cancel`);
      await fetchDashboard();
    } catch (err: any) {
      // Local fallback removal
      const local = localStorage.getItem('campusconnect_user_registrations');
      if (local) {
        try {
          const regs = JSON.parse(local).filter((r: any) => r.event_id !== eventId && r.id !== eventId);
          localStorage.setItem('campusconnect_user_registrations', JSON.stringify(regs));
          await fetchDashboard();
          return;
        } catch (e) {}
      }
      alert(err.response?.data?.error || 'Cancellation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return '';
    }
  };

  if (loading) {
    return <div className="p-16 text-center text-slate-500 text-xs">{t.common.loading}</div>;
  }

  const activeRegistrations = (data?.registrations || []).filter((r: any) => r.registration_status === 'confirmed');
  const notificationsList = data?.notifications || [];

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
              <h2 className="text-xl font-bold text-slate-900">{user?.fullName || 'Student'}</h2>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full uppercase">
                Student
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {user?.email || 'student@rupp.edu.kh'} — {user?.universityNameEn || 'Royal University of Phnom Penh (RUPP)'}
            </p>
          </div>
        </div>

        <div className="flex gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 text-xs">
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
                key={reg.registration_id || reg.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                      {reg.category || 'academic'}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Confirmed
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 leading-snug">
                    {language === 'km' ? (reg.title_km || reg.title_en) : (reg.title_en || reg.title_km)}
                  </h4>

                  <div className="space-y-1 text-xs text-slate-500 pt-1">
                    {reg.start_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateTime(reg.start_time)}</span>
                      </div>
                    )}
                    {(reg.room_or_venue_details || reg.building_name_en) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{reg.room_or_venue_details || reg.building_name_en}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => onSelectEvent(reg.event_id || reg.id)}
                    className="text-brand-600 font-bold hover:underline cursor-pointer"
                  >
                    View Details
                  </button>

                  <button
                    onClick={() => handleCancelRegistration(reg.event_id || reg.id)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
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
          {notificationsList.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              {language === 'km' ? 'គ្មានការជូនដំណឹងថ្មីទេ' : 'No notifications at this time.'}
            </div>
          ) : (
            notificationsList.map((n: any) => (
              <div key={n.id} className="p-4 flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <h5 className="font-bold text-slate-900">
                    {language === 'km' ? (n.title_km || n.title_en) : (n.title_en || n.title_km)}
                  </h5>
                  <p className="text-slate-600 mt-0.5">
                    {language === 'km' ? (n.message_km || n.message_en) : (n.message_en || n.message_km)}
                  </p>
                  {n.created_at && (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {formatDateTime(n.created_at)}
                    </span>
                  )}
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
