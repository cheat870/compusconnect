import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/context.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  Shield,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Save,
  Search,
  ExternalLink,
  History,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Layers,
  Calendar,
  AlertTriangle
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Coordinate correction tool state
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | ''>('');
  const [coordForm, setCoordForm] = useState({
    latitude: '',
    longitude: '',
    sourceUrl: 'https://www.openstreetmap.org/',
    verificationStatus: 'verified',
    reason: 'GPS coordinate physical validation',
  });
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  // Approval queue processing state
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [deletingBuildingId, setDeletingBuildingId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashRes, buildingsRes, eventsRes] = await Promise.all([
        api.get('/dashboards/admin'),
        api.get('/buildings'),
        api.get('/events?include_all=true'),
      ]);

      if (dashRes.data.success) {
        setDashboardData(dashRes.data.data);
      }
      if (buildingsRes.data.success) {
        setBuildings(buildingsRes.data.data);
      }
      if (eventsRes.data.success) {
        setEvents(eventsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectBuilding = (id: number) => {
    setSelectedBuildingId(id);
    const b = buildings.find((item) => item.id === id);
    if (b) {
      setCoordForm({
        latitude: String(b.latitude),
        longitude: String(b.longitude),
        sourceUrl: b.source_url || 'https://www.openstreetmap.org/',
        verificationStatus: b.verification_status,
        reason: 'Authorized administrator GPS coordinate correction',
      });
    }
  };

  const handleUpdateCoordinates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuildingId) return;

    try {
      setUpdateStatus('Updating coordinates...');
      const res = await api.put(`/buildings/${selectedBuildingId}/coordinates`, {
        latitude: parseFloat(coordForm.latitude),
        longitude: parseFloat(coordForm.longitude),
        sourceUrl: coordForm.sourceUrl,
        sourceType: 'openstreetmap',
        verificationStatus: coordForm.verificationStatus,
        reason: coordForm.reason,
      });

      if (res.data.success) {
        setUpdateStatus('Coordinates successfully updated and logged to audit trail!');
        await fetchData();
        setTimeout(() => setUpdateStatus(null), 4000);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update coordinates');
      setUpdateStatus(null);
    }
  };

  const handleDeleteBuilding = async (building: any) => {
    if (!window.confirm(
      language === 'km'
        ? `តើអ្នកប្រាកដជាចង់លុបអគារ "${building.name_km || building.name_en}" មែនទេ?`
        : `Are you sure you want to delete building "${building.name_en}"? This action is irreversible and will be logged.`
    )) {
      return;
    }

    try {
      setDeletingBuildingId(building.id);
      await api.delete(`/buildings/${building.id}`);
      if (selectedBuildingId === building.id) {
        setSelectedBuildingId('');
      }
      await fetchData();
      alert(language === 'km' ? 'អគារត្រូវបានលុបចេញដោយជោគជ័យ' : 'Facility deleted successfully.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete building');
    } finally {
      setDeletingBuildingId(null);
    }
  };

  const handleEventApproval = async (eventId: number, status: 'approved' | 'rejected') => {
    let rejectionReason = '';
    if (status === 'rejected') {
      const reason = window.prompt(
        language === 'km'
          ? 'សូមបញ្ចូលមូលហេតុនៃការបដិសេធ (ស្រេចចិត្ត):'
          : 'Please enter reason for rejection (optional):'
      );
      if (reason === null) return; // User cancelled prompt
      rejectionReason = reason;
    }

    try {
      setApprovingId(eventId);
      const res = await api.put(`/events/${eventId}/approval`, {
        approvalStatus: status,
        rejectionReason,
      });

      if (res.data.success) {
        await fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update event approval status');
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return <div className="p-16 text-center text-slate-500 text-xs">{t.common.loading}</div>;
  }

  const metrics = dashboardData?.metrics || {};
  const auditLogs = dashboardData?.auditLogs || [];
  const pendingEvents = events.filter((e) => e.approval_status === 'pending');

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
            {dashboardData?.scope || 'Global Platform Administration'}
          </span>
          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
            Role: {user?.role}
          </span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 mt-1">{t.dashboard.adminTitle}</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Source-of-truth verification, institutional scoping, event approval queue, and audit logs.
        </p>
      </div>

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-2xl font-black text-slate-900">{metrics.campuses || 0}</span>
          <p className="text-xs font-bold text-slate-700 mt-1">Campuses</p>
          <p className="text-[10px] text-slate-400">Institutional sites</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-2xl font-black text-emerald-600">{metrics.buildingsVerified || 0}</span>
          <p className="text-xs font-bold text-slate-700 mt-1">Verified Facilities</p>
          <p className="text-[10px] text-slate-400">Accurate OpenStreetMap GPS</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-2xl font-black text-amber-500">{pendingEvents.length}</span>
          <p className="text-xs font-bold text-slate-700 mt-1">Pending Approvals</p>
          <p className="text-[10px] text-slate-400">Events in review queue</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-2xl font-black text-brand-600">{metrics.totalRegistrations || 0}</span>
          <p className="text-xs font-bold text-slate-700 mt-1">Registrations</p>
          <p className="text-[10px] text-slate-400">All student attendees</p>
        </div>
      </div>

      {/* Event Approval Queue Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-600" />
              Event Approval Queue
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and authorize organizer-submitted campus events before publication.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            {pendingEvents.length} Pending
          </span>
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No events found in this institution.</div>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="p-3">Event Title</th>
                  <th className="p-3">Organizer</th>
                  <th className="p-3">Campus / Venue</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Approval</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {events.map((ev) => {
                  const approval = ev.approval_status || 'approved';
                  const isProcessing = approvingId === ev.id;

                  return (
                    <tr key={ev.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900 max-w-xs">
                        <div className="truncate">{language === 'km' ? ev.title_km : ev.title_en}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Capacity: {ev.capacity} • {ev.category}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">{ev.organizer_name || 'Organizer'}</td>
                      <td className="p-3 text-slate-600">
                        {ev.building_name_en || ev.campus_name_en}
                      </td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {new Date(ev.start_time).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        {approval === 'approved' && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Approved
                          </span>
                        )}
                        {approval === 'pending' && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500" /> Pending Review
                          </span>
                        )}
                        {approval === 'rejected' && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-500" /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {approval !== 'approved' && (
                            <button
                              disabled={isProcessing}
                              onClick={() => handleEventApproval(ev.id, 'approved')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50"
                              title="Approve Event"
                            >
                              <ThumbsUp className="w-3 h-3" /> Approve
                            </button>
                          )}
                          {approval !== 'rejected' && (
                            <button
                              disabled={isProcessing}
                              onClick={() => handleEventApproval(ev.id, 'rejected')}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center gap-1 transition-colors disabled:opacity-50"
                              title="Reject Event"
                            >
                              <ThumbsDown className="w-3 h-3" /> Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Coordinate Verification & Facility Correction Workflow */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-600" />
            {t.dashboard.coordinatesManager}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain strict source-of-truth accuracy. Correct or verify facility coordinates with documented OpenStreetMap or official GPS sources.
          </p>
        </div>

        {updateStatus && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {updateStatus}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Building Picker List */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Select Building to Review / Manage ({buildings.length})</label>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-100">
              {buildings.map((b) => {
                const isSelected = selectedBuildingId === b.id;
                const isVerified = b.verification_status === 'verified';
                return (
                  <div
                    key={b.id}
                    onClick={() => handleSelectBuilding(b.id)}
                    className={`p-3 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-brand-50 text-brand-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{b.name_en} ({b.code || 'FACILITY'})</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {Number(b.latitude).toFixed(5)}, {Number(b.longitude).toFixed(5)} • {b.category}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isVerified ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                          Verified
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                          Unverified
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBuilding(b);
                        }}
                        disabled={deletingBuildingId === b.id}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Building"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coordinate Form */}
          <form onSubmit={handleUpdateCoordinates} className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="font-bold text-slate-800">
              {selectedBuildingId
                ? `Edit Coordinates for #${selectedBuildingId}`
                : 'Select a facility on the left to edit'}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-600">Latitude (Decimal)</label>
                <input
                  type="text"
                  required
                  disabled={!selectedBuildingId}
                  value={coordForm.latitude}
                  onChange={(e) => setCoordForm({ ...coordForm, latitude: e.target.value })}
                  placeholder="e.g. 11.56840000"
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600">Longitude (Decimal)</label>
                <input
                  type="text"
                  required
                  disabled={!selectedBuildingId}
                  value={coordForm.longitude}
                  onChange={(e) => setCoordForm({ ...coordForm, longitude: e.target.value })}
                  placeholder="e.g. 104.89370000"
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-600">Source of Truth Reference URL</label>
              <input
                type="url"
                required
                disabled={!selectedBuildingId}
                value={coordForm.sourceUrl}
                onChange={(e) => setCoordForm({ ...coordForm, sourceUrl: e.target.value })}
                placeholder="https://www.openstreetmap.org/way/..."
                className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-600">Verification Classification</label>
              <select
                disabled={!selectedBuildingId}
                value={coordForm.verificationStatus}
                onChange={(e) => setCoordForm({ ...coordForm, verificationStatus: e.target.value })}
                className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg"
              >
                <option value="verified">Verified (Confirmed with high confidence)</option>
                <option value="unverified">Unverified (Pending physical inspection)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-600">Audit Justification / Note</label>
              <input
                type="text"
                disabled={!selectedBuildingId}
                value={coordForm.reason}
                onChange={(e) => setCoordForm({ ...coordForm, reason: e.target.value })}
                className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!selectedBuildingId}
                className="w-full py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Save & Log Verification Audit
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* System Audit Logs Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            {t.dashboard.auditLogs}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of institutional actions, coordinate changes, and access security.
          </p>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
                <th className="p-3">User</th>
                <th className="p-3">Institution</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
              {auditLogs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="p-3 whitespace-nowrap text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{log.action}</td>
                  <td className="p-3 text-slate-600">{log.entity_type} #{log.entity_id || '-'}</td>
                  <td className="p-3 text-slate-600">{log.user_email || 'System'}</td>
                  <td className="p-3 text-slate-600">{log.university_acronym || 'Global'}</td>
                  <td className="p-3 text-slate-500 max-w-xs truncate" title={typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}>
                    {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
