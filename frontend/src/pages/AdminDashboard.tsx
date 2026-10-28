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
  History
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashRes, buildingsRes] = await Promise.all([
        api.get('/dashboards/admin'),
        api.get('/buildings'),
      ]);

      if (dashRes.data.success) {
        setDashboardData(dashRes.data.data);
      }
      if (buildingsRes.data.success) {
        setBuildings(buildingsRes.data.data);
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
      setUpdateStatus('Updating...');
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

  if (loading) {
    return <div className="p-16 text-center text-slate-500 text-xs">{t.common.loading}</div>;
  }

  const metrics = dashboardData?.metrics || {};
  const auditLogs = dashboardData?.auditLogs || [];

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
          Source-of-truth verification, institutional scoping, and audit logs.
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
          <span className="text-2xl font-black text-amber-500">{metrics.buildingsUnverified || 0}</span>
          <p className="text-xs font-bold text-slate-700 mt-1">Awaiting Review</p>
          <p className="text-[10px] text-slate-400">Require coordinate check</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-2xl font-black text-brand-600">{metrics.totalRegistrations || 0}</span>
          <p className="text-xs font-bold text-slate-700 mt-1">Registrations</p>
          <p className="text-[10px] text-slate-400">All student attendees</p>
        </div>
      </div>

      {/* Coordinate Verification & Correction Workflow (Acceptance Test 3 & Data Verification Scope) */}
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
            <label className="text-xs font-bold text-slate-700">Select Building to Review</label>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100">
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
                      <div className="font-bold">{b.name_en}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {Number(b.latitude).toFixed(5)}, {Number(b.longitude).toFixed(5)}
                      </div>
                    </div>
                    {isVerified ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        Verified
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                        Unverified
                      </span>
                    )}
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
