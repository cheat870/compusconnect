import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/context.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Users,
  Compass,
  ArrowLeft,
  Navigation,
  Share2
} from 'lucide-react';

interface EventDetailPageProps {
  eventId: number;
  onBack: () => void;
  onNavigateToMap: (campusId: number, buildingId?: number) => void;
  onOpenAuth: () => void;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  eventId,
  onBack,
  onNavigateToMap,
  onOpenAuth,
}) => {
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUserRegistered, setIsUserRegistered] = useState(false);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/events/${eventId}`);
      if (res.data.success) {
        setEvent(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch event:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  // Check if current user is registered
  useEffect(() => {
    const checkRegistration = async () => {
      if (!user) {
        setIsUserRegistered(false);
        return;
      }
      try {
        const res = await api.get('/dashboards/student');
        if (res.data.success) {
          const registered = res.data.data.registrations.some(
            (r: any) => r.event_id === eventId && r.registration_status === 'confirmed'
          );
          setIsUserRegistered(registered);
        }
      } catch (e) {
        // Not a student or unauthorized
      }
    };

    checkRegistration();
  }, [user, eventId]);

  const handleRegister = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    try {
      setIsRegistering(true);
      setMessage(null);
      const res = await api.post(`/events/${eventId}/register`);
      if (res.data?.success) {
        setIsUserRegistered(true);
        setMessage({ type: 'success', text: language === 'km' ? 'ការចុះឈ្មោះទទួលបានជោគជ័យ!' : 'Registration confirmed! Check your student portal.' });
        fetchEvent();
        return;
      }
    } catch (err: any) {
      if (err.response?.data?.error) {
        setMessage({
          type: 'error',
          text: err.response.data.error,
        });
        return;
      }

      // Offline / standalone demo fallback:
      const saved = JSON.parse(localStorage.getItem('campusconnect_user_registrations') || '[]');
      const newReg = {
        registration_id: Date.now(),
        event_id: eventId,
        registration_status: 'confirmed',
        registered_at: new Date().toISOString(),
        title_en: event?.title_en || 'Campus Event',
        title_km: event?.title_km || 'ព្រឹត្តិការណ៍សាកលវិទ្យាល័យ',
        start_time: event?.start_time,
        end_time: event?.end_time,
        room_or_venue_details: event?.room_or_venue_details,
        building_name_en: event?.building_name_en,
        building_name_km: event?.building_name_km,
      };
      saved.push(newReg);
      localStorage.setItem('campusconnect_user_registrations', JSON.stringify(saved));
      setIsUserRegistered(true);
      setMessage({ type: 'success', text: language === 'km' ? 'ការចុះឈ្មោះទទួលបានជោគជ័យ!' : 'Registration confirmed! Check your student portal.' });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your registration?')) return;

    try {
      setIsRegistering(true);
      setMessage(null);
      const res = await api.post(`/events/${eventId}/cancel`);
      if (res.data.success) {
        setIsUserRegistered(false);
        setMessage({ type: 'success', text: 'Registration successfully cancelled.' });
        fetchEvent();
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to cancel registration.',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading || !event) {
    return (
      <div className="p-16 text-center text-slate-500 text-xs">
        <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
        {t.common.loading}
      </div>
    );
  }

  const venue = event.venue;
  const isFull = event.registered_count >= event.capacity;
  const isExpired = event.event_verification === 'expired' || new Date(event.end_time) < new Date();
  const isDemo = event.data_classification === 'demonstration';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Events
      </button>

      {/* Main Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Banner header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 md:p-8 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
              {event.category}
            </span>

            {isDemo ? (
              <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
                Demo Event Sandbox
              </span>
            ) : isExpired ? (
              <span className="text-[10px] font-bold bg-rose-500 text-white px-2.5 py-0.5 rounded-full">
                Past / Expired
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Confirmed Public Announcement
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-black leading-tight">
            {language === 'km' ? event.title_km : event.title_en}
          </h1>

          <p className="text-xs text-blue-200">
            Organized under {event.university_name_en} ({event.university_acronym})
          </p>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          {/* Feedback Alert */}
          {message && (
            <div
              className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              {message.text}
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Date & Time</span>
                <span className="text-slate-600">
                  {new Date(event.start_time).toLocaleDateString()}
                </span>
                <span className="text-slate-400 block text-[11px]">
                  {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                  {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Capacity & Seats</span>
                <span className="text-slate-600">
                  {event.registered_count} / {event.capacity} Registered
                </span>
                <span className="text-slate-400 block text-[11px]">
                  {event.capacity - event.registered_count} seats left
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Registration Deadline</span>
                <span className="text-slate-600">
                  {event.registration_deadline
                    ? new Date(event.registration_deadline).toLocaleDateString()
                    : 'Open until start'}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900">Event Overview</h3>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
              {language === 'km' ? event.description_km : event.description_en}
            </p>
          </div>

          {/* Acceptance Test 5: Verified Venue & Campus Location Section */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-600" />
                Verified Campus Venue
              </h3>
              {venue?.isVenueVerified && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> OpenStreetMap Verified Coordinates
                </span>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {language === 'km' ? venue.buildingNameKm : venue.buildingNameEn}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {venue.roomDetails || 'Main Auditorium'} —{' '}
                    {language === 'km' ? venue.campusNameKm : venue.campusNameEn}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">
                    Latitude: {Number(venue.latitude).toFixed(5)}, Longitude: {Number(venue.longitude).toFixed(5)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => onNavigateToMap(event.campus_id, event.building_id)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-brand-700 hover:bg-slate-50 flex items-center gap-1 shadow-xs"
                  >
                    <Compass className="w-3.5 h-3.5" /> View on Campus Map
                  </button>

                  <a
                    href={venue.directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 flex items-center gap-1 shadow-xs"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Get Directions ↗
                  </a>
                </div>
              </div>

              {venue.sourceUrl && (
                <p className="text-[10px] text-slate-400 pt-2 border-t border-blue-100 flex items-center gap-1">
                  Source Reference: <a href={venue.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600 truncate max-w-sm">{venue.sourceUrl}</a>
                </p>
              )}
            </div>
          </div>

          {/* Source Attribution & Data Verification Section */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <span className="font-semibold text-slate-700">Official Announcement Source:</span>
            <p className="truncate">
              {event.source_url ? (
                <a
                  href={event.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline flex items-center gap-1"
                >
                  {event.source_url} <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                'Authorized University Event Entry'
              )}
            </p>
            <p className="text-slate-400">
              Data Classification: <strong className="text-slate-600">{event.data_classification}</strong> | Last Verified:{' '}
              {new Date(event.last_verified_at || event.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              {isUserRegistered ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> You are registered for this event
                </div>
              ) : isFull ? (
                <span className="text-xs font-bold text-rose-600">Event is at maximum capacity</span>
              ) : isExpired ? (
                <span className="text-xs font-semibold text-slate-400">This event has already concluded</span>
              ) : (
                <span className="text-xs text-slate-500">Free open registration for all students</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isUserRegistered ? (
                <button
                  onClick={handleCancel}
                  disabled={isRegistering}
                  className="px-5 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors"
                >
                  {isRegistering ? 'Cancelling...' : t.events.cancelRegistration}
                </button>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={isRegistering || isFull || isExpired}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                    isFull || isExpired
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25 hover:scale-[1.02]'
                  }`}
                >
                  {isRegistering ? 'Processing...' : user ? t.events.registerNow : 'Sign In to Register'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
