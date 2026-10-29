import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/context.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  Calendar,
  Plus,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  X,
  XCircle,
  UserCheck,
  Eye,
  FileText,
  Send
} from 'lucide-react';

interface Attendee {
  registration_id: number;
  status: string;
  registered_at: string;
  user_id: number;
  full_name: string;
  full_name_km?: string;
  email: string;
  phone?: string;
  student_id_number?: string;
}

export const OrganizerDashboard: React.FC<{ onSelectEvent: (id: number) => void }> = ({ onSelectEvent }) => {
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);

  // Attendees modal state
  const [selectedEventForAttendees, setSelectedEventForAttendees] = useState<any | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);

  // Create form state
  const [form, setForm] = useState({
    titleEn: '',
    titleKm: '',
    slug: '',
    category: 'academic',
    campusId: 1,
    buildingId: '',
    roomOrVenueDetails: '',
    startTime: '2026-11-20T09:00',
    endTime: '2026-11-20T17:00',
    capacity: 60,
    descriptionEn: '',
    descriptionKm: '',
    status: 'published',
    sourceUrl: 'https://www.rupp.edu.kh/',
  });

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboards/organizer');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load organizer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    const fetchMetadata = async () => {
      try {
        const [campusesRes, buildingsRes] = await Promise.all([
          api.get('/campuses?university_id=1'),
          api.get('/buildings?campus_id=1'),
        ]);
        if (campusesRes.data.success) setCampuses(campusesRes.data.data);
        if (buildingsRes.data.success) setBuildings(buildingsRes.data.data);
      } catch (e) {}
    };
    fetchMetadata();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/events', {
        universityId: user?.universityId || 1,
        campusId: Number(form.campusId),
        buildingId: form.buildingId ? Number(form.buildingId) : null,
        slug: form.slug || `event-${Date.now()}`,
        titleEn: form.titleEn,
        titleKm: form.titleKm,
        category: form.category,
        descriptionEn: form.descriptionEn,
        descriptionKm: form.descriptionKm,
        roomOrVenueDetails: form.roomOrVenueDetails,
        startTime: form.startTime,
        endTime: form.endTime,
        capacity: Number(form.capacity),
        status: form.status,
        eventVerification: 'confirmed',
        dataClassification: 'verified_public',
        sourceUrl: form.sourceUrl,
        sourceType: 'authorized_organizer_entry',
      });

      if (res.data.success) {
        setShowCreateModal(false);
        setForm({
          titleEn: '',
          titleKm: '',
          slug: '',
          category: 'academic',
          campusId: 1,
          buildingId: '',
          roomOrVenueDetails: '',
          startTime: '2026-11-20T09:00',
          endTime: '2026-11-20T17:00',
          capacity: 60,
          descriptionEn: '',
          descriptionKm: '',
          status: 'published',
          sourceUrl: 'https://www.rupp.edu.kh/',
        });
        fetchDashboard();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to publish event');
    }
  };

  const handleViewAttendees = async (ev: any) => {
    setSelectedEventForAttendees(ev);
    setLoadingAttendees(true);
    setAttendeeError(null);
    try {
      const res = await api.get(`/events/${ev.id}/attendees`);
      if (res.data.success) {
        setAttendees(res.data.data);
      }
    } catch (err: any) {
      setAttendeeError(err.response?.data?.error || 'Failed to load attendee roster');
    } finally {
      setLoadingAttendees(false);
    }
  };

  if (loading) {
    return <div className="p-16 text-center text-slate-500 text-xs">{t.common.loading}</div>;
  }

  const events = data?.events || [];
  const metrics = data?.metrics || { totalEvents: 0, activeEvents: 0, totalRegistrations: 0 };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{t.dashboard.organizerTitle}</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage official events for {user?.universityNameEn || 'Royal University of Phnom Penh (RUPP)'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> {t.dashboard.createNewEvent}
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-3xl font-black text-slate-900">{metrics.totalEvents}</span>
          <p className="text-xs font-bold text-slate-700 mt-1">Total Managed Events</p>
          <p className="text-[11px] text-slate-400">Created across RUPP campuses</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-3xl font-black text-brand-600">{metrics.activeEvents}</span>
          <p className="text-xs font-bold text-slate-700 mt-1">Active Upcoming</p>
          <p className="text-[11px] text-slate-400">Published and accepting bookings</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-3xl font-black text-emerald-600">{metrics.totalRegistrations}</span>
          <p className="text-xs font-bold text-slate-700 mt-1">Total Student Registrations</p>
          <p className="text-[11px] text-slate-400">Across all organized sessions</p>
        </div>
      </div>

      {/* Events Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
          <span>Managed University Events ({events.length})</span>
          <span className="text-slate-400 font-normal">Real-time registration tracking</span>
        </div>

        <div className="divide-y divide-slate-100">
          {events.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No events currently organized.</div>
          ) : (
            events.map((ev: any) => {
              const approval = ev.approval_status || 'approved';
              return (
                <div key={ev.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {ev.category}
                      </span>
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                        {ev.status}
                      </span>
                      {approval === 'approved' && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Approved
                        </span>
                      )}
                      {approval === 'pending' && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" /> Pending Review
                        </span>
                      )}
                      {approval === 'rejected' && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-500" /> Rejected
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">
                      {language === 'km' ? ev.title_km : ev.title_en}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {new Date(ev.start_time).toLocaleDateString()} — {ev.building_name_en || ev.campus_name_en}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-6 shrink-0 flex-wrap">
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900">
                        {ev.registered_count} / {ev.capacity}
                      </span>
                      <p className="text-[10px] text-slate-400">{ev.fill_percentage}% full</p>
                    </div>

                    <button
                      onClick={() => handleViewAttendees(ev)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-xs font-bold text-blue-700 transition-colors flex items-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Attendees ({ev.registered_count})
                    </button>

                    <button
                      onClick={() => onSelectEvent(ev.id)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Attendees Roster Modal */}
      {selectedEventForAttendees && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col space-y-4">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full uppercase">
                  Attendee Roster
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {language === 'km' ? selectedEventForAttendees.title_km : selectedEventForAttendees.title_en}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Capacity: {selectedEventForAttendees.registered_count} of {selectedEventForAttendees.capacity} seats confirmed
                </p>
              </div>
              <button
                onClick={() => setSelectedEventForAttendees(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingAttendees ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-2" />
                Loading registered attendees...
              </div>
            ) : attendeeError ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {attendeeError}
              </div>
            ) : attendees.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No student attendees have registered for this event yet.
              </div>
            ) : (
              <div className="overflow-y-auto max-h-96 border border-slate-200 rounded-2xl divide-y divide-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold sticky top-0">
                    <tr>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Student ID</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Registered At</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {attendees.map((att) => (
                      <tr key={att.registration_id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-900">
                          {att.full_name}
                          {att.full_name_km && <span className="block text-[10px] text-slate-400 font-normal">{att.full_name_km}</span>}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">
                          {att.student_id_number || 'N/A'}
                        </td>
                        <td className="p-3 text-slate-600 font-mono text-[11px]">{att.email}</td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {new Date(att.registered_at).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            att.status === 'confirmed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {att.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedEventForAttendees(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Publish New Verified Campus Event</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Title (English)</label>
                <input
                  type="text"
                  required
                  value={form.titleEn}
                  onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                  placeholder="e.g. RUPP Artificial Intelligence Symposium 2026"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Title (Khmer)</label>
                <input
                  type="text"
                  required
                  value={form.titleKm}
                  onChange={(e) => setForm({ ...form, titleKm: e.target.value })}
                  placeholder="e.g. សិក្ខាសាលាបញ្ញាសិប្បនិម្មិត RUPP ឆ្នាំ២០២៦"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="academic">Academic</option>
                    <option value="career_fair">Career Fair</option>
                    <option value="technology">Technology</option>
                    <option value="cultural">Cultural</option>
                    <option value="workshop">Workshop</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Capacity (Seats)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Campus</label>
                  <select
                    value={form.campusId}
                    onChange={(e) => setForm({ ...form, campusId: Number(e.target.value) })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                  >
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Building Venue</label>
                  <select
                    value={form.buildingId}
                    onChange={(e) => setForm({ ...form, buildingId: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="">-- Select Verified Building --</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name_en} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Room or Venue Details</label>
                <input
                  type="text"
                  value={form.roomOrVenueDetails}
                  onChange={(e) => setForm({ ...form, roomOrVenueDetails: e.target.value })}
                  placeholder="e.g. Angkor Kizuna Hall, Ground Floor"
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Publishing Mode</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="published">Publish (Submit for Student Registration)</option>
                  <option value="draft">Save as Draft (Private)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Description (English)</label>
                <textarea
                  required
                  rows={2}
                  value={form.descriptionEn}
                  onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                  placeholder="Overview of the event..."
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Description (Khmer)</label>
                <textarea
                  required
                  rows={2}
                  value={form.descriptionKm}
                  onChange={(e) => setForm({ ...form, descriptionKm: e.target.value })}
                  placeholder="ពិពណ៌នាសង្ខេបអំពីព្រឹត្តិការណ៍..."
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Official Announcement URL</label>
                <input
                  type="url"
                  required
                  value={form.sourceUrl}
                  onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                  placeholder="https://www.rupp.edu.kh/..."
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;
