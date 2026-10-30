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
  AlertTriangle,
  Users,
  KeyRound,
  GraduationCap,
  ClipboardList,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  X,
  UserCheck,
  UserX
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { language, t } = useLanguage();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'roles' | 'universities' | 'buildings' | 'events' | 'registrations' | 'audit-logs' | 'settings'
  >('overview');

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Users Tab State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState<any>({ total: 0, totalPages: 1 });
  const [selectedUserForRole, setSelectedUserForRole] = useState<any | null>(null);
  const [newRoleSelect, setNewRoleSelect] = useState<string>('student');

  // Universities Tab State
  const [universities, setUniversities] = useState<any[]>([]);

  // Buildings Tab State
  const [buildings, setBuildings] = useState<any[]>([]);
  const [buildingSearch, setBuildingSearch] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | ''>('');
  const [coordForm, setCoordForm] = useState({
    latitude: '',
    longitude: '',
    sourceUrl: 'https://www.openstreetmap.org/',
    verificationStatus: 'verified',
    reason: 'GPS coordinate physical validation',
  });
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [deletingBuildingId, setDeletingBuildingId] = useState<number | null>(null);

  // Events Tab State
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [eventSearch, setEventSearch] = useState('');
  const [eventStatusFilter, setEventStatusFilter] = useState('');
  const [eventPage, setEventPage] = useState(1);
  const [eventPagination, setEventPagination] = useState<any>({ total: 0, totalPages: 1 });
  const [approvingId, setApprovingId] = useState<number | null>(null);

  // Registrations Tab State
  const [registrationsList, setRegistrationsList] = useState<any[]>([]);
  const [regPage, setRegPage] = useState(1);
  const [regPagination, setRegPagination] = useState<any>({ total: 0, totalPages: 1 });

  // Audit Logs Tab State
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPagination, setAuditPagination] = useState<any>({ total: 0, totalPages: 1 });

  // 1. Fetch Dashboard Overview
  const fetchDashboardOverview = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/dashboard');
      if (res.data.success) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard overview:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Users
  const fetchUsers = async () => {
    try {
      const params: any = { page: userPage, limit: 15 };
      if (userSearch.trim()) params.search = userSearch.trim();
      if (userRoleFilter) params.role = userRoleFilter;

      const res = await api.get('/admin/users', { params });
      if (res.data.success) {
        setUsersList(res.data.data);
        setUserPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  // 3. Fetch Universities
  const fetchUniversities = async () => {
    try {
      const res = await api.get('/universities');
      if (res.data.success) {
        setUniversities(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch universities:', err);
    }
  };

  // 4. Fetch Buildings
  const fetchBuildings = async () => {
    try {
      const res = await api.get('/buildings');
      if (res.data.success) {
        setBuildings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch buildings:', err);
    }
  };

  // 5. Fetch Events
  const fetchEvents = async () => {
    try {
      const params: any = { page: eventPage, limit: 15 };
      if (eventSearch.trim()) params.search = eventSearch.trim();
      if (eventStatusFilter) params.approval_status = eventStatusFilter;

      const res = await api.get('/admin/events', { params });
      if (res.data.success) {
        setEventsList(res.data.data);
        setEventPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch admin events:', err);
    }
  };

  // 6. Fetch Registrations
  const fetchRegistrations = async () => {
    try {
      const res = await api.get('/admin/registrations', { params: { page: regPage, limit: 15 } });
      if (res.data.success) {
        setRegistrationsList(res.data.data);
        setRegPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
    }
  };

  // 7. Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/admin/audit-logs', { params: { page: auditPage, limit: 20 } });
      if (res.data.success) {
        setAuditLogsList(res.data.data);
        setAuditPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  useEffect(() => {
    fetchDashboardOverview();
    fetchUniversities();
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'events') fetchEvents();
    if (activeTab === 'registrations') fetchRegistrations();
    if (activeTab === 'audit-logs') fetchAuditLogs();
  }, [activeTab, userPage, userRoleFilter, eventPage, eventStatusFilter, regPage, auditPage]);

  // Handle Role Change
  const handleUpdateUserRole = async () => {
    if (!selectedUserForRole) return;
    try {
      await api.patch(`/admin/users/${selectedUserForRole.id}/role`, { role: newRoleSelect });
      setSelectedUserForRole(null);
      await fetchUsers();
      await fetchDashboardOverview();
      alert('User role updated successfully');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  };

  // Handle User Status Toggle
  const handleToggleUserStatus = async (targetUser: any) => {
    const newStatus = !targetUser.is_active;
    if (!window.confirm(`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} account for ${targetUser.email}?`)) {
      return;
    }
    try {
      await api.patch(`/admin/users/${targetUser.id}/status`, { isActive: newStatus });
      await fetchUsers();
      await fetchDashboardOverview();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update user status');
    }
  };

  // Handle Coordinate Form Selection
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

  // Handle Coordinate Save
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
        await fetchBuildings();
        await fetchDashboardOverview();
        setTimeout(() => setUpdateStatus(null), 4000);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update coordinates');
      setUpdateStatus(null);
    }
  };

  // Handle Building Deletion
  const handleDeleteBuilding = async (building: any) => {
    if (!window.confirm(`Are you sure you want to delete facility "${building.name_en}"?`)) return;

    try {
      setDeletingBuildingId(building.id);
      await api.delete(`/buildings/${building.id}`);
      if (selectedBuildingId === building.id) setSelectedBuildingId('');
      await fetchBuildings();
      await fetchDashboardOverview();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete building');
    } finally {
      setDeletingBuildingId(null);
    }
  };

  // Handle Event Approve
  const handleApproveEvent = async (eventId: number) => {
    try {
      setApprovingId(eventId);
      await api.post(`/admin/events/${eventId}/approve`);
      await fetchEvents();
      await fetchDashboardOverview();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve event');
    } finally {
      setApprovingId(null);
    }
  };

  // Handle Event Reject
  const handleRejectEvent = async (eventId: number) => {
    const reason = window.prompt(t.admin.rejectionReasonPrompt);
    if (!reason || reason.trim().length === 0) {
      alert('Rejection reason is required.');
      return;
    }

    try {
      setApprovingId(eventId);
      await api.post(`/admin/events/${eventId}/reject`, { rejectionReason: reason.trim() });
      await fetchEvents();
      await fetchDashboardOverview();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject event');
    } finally {
      setApprovingId(null);
    }
  };

  const metrics = dashboardData?.metrics || {};
  const recentActions = dashboardData?.recentActions || [];

  const navItems = [
    { id: 'overview', label: t.admin.overview, icon: Shield },
    { id: 'users', label: t.admin.users, icon: Users },
    { id: 'roles', label: t.admin.roles, icon: KeyRound },
    { id: 'universities', label: t.admin.universities, icon: GraduationCap },
    { id: 'buildings', label: t.admin.buildings, icon: Building2 },
    { id: 'events', label: t.admin.events, icon: Calendar },
    { id: 'registrations', label: t.admin.registrations, icon: ClipboardList },
    { id: 'audit-logs', label: t.admin.auditLogs, icon: History },
    { id: 'settings', label: t.admin.settings, icon: Settings },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-brand-600 uppercase tracking-wider">
              {dashboardData?.scope || 'Administration Panel'}
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {user?.role}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1">{t.dashboard.adminTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-Based Access Control, tenant isolation, verified campus locations, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block text-xs">
            <div className="font-bold text-slate-900">{user?.fullName}</div>
            <div className="text-[11px] text-slate-400">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t.nav.logout}
          </button>
        </div>
      </div>

      {/* Main Dashboard Layout with Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64 shrink-0 bg-white rounded-3xl border border-slate-200 p-3 shadow-xs space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Management Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.id === 'events' && metrics.pendingApprovals > 0 && (
                  <span className="ml-auto text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-mono">
                    {metrics.pendingApprovals}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Viewport */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
                  <span className="text-3xl font-black text-slate-900">{metrics.totalUsers || 0}</span>
                  <p className="text-xs font-bold text-slate-700 mt-1">{t.admin.totalUsers}</p>
                  <p className="text-[11px] text-slate-400">{metrics.activeUsers || 0} active accounts</p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
                  <span className="text-3xl font-black text-amber-600">{metrics.pendingApprovals || 0}</span>
                  <p className="text-xs font-bold text-slate-700 mt-1">{t.admin.pendingApprovals}</p>
                  <p className="text-[11px] text-slate-400">Awaiting moderator check</p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
                  <span className="text-3xl font-black text-emerald-600">{metrics.verifiedBuildings || 0}</span>
                  <p className="text-xs font-bold text-slate-700 mt-1">{t.admin.verifiedBuildings}</p>
                  <p className="text-[11px] text-slate-400">OpenStreetMap GPS accuracy</p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
                  <span className="text-3xl font-black text-brand-600">{metrics.publishedEvents || 0}</span>
                  <p className="text-xs font-bold text-slate-700 mt-1">{t.admin.totalEvents}</p>
                  <p className="text-[11px] text-slate-400">{metrics.totalEvents || 0} overall listings</p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
                  <span className="text-3xl font-black text-indigo-600">{metrics.totalRegistrations || 0}</span>
                  <p className="text-xs font-bold text-slate-700 mt-1">{t.admin.totalRegistrations}</p>
                  <p className="text-[11px] text-slate-400">Student bookings confirmed</p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
                  <span className="text-3xl font-black text-slate-700">{metrics.monthlyActiveUsers || 0}</span>
                  <p className="text-xs font-bold text-slate-700 mt-1">Monthly Active</p>
                  <p className="text-[11px] text-slate-400">Users logged in past 30 days</p>
                </div>
              </div>

              {/* Recent Actions Table */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    Recent System Actions & Security Audit
                  </h3>
                  <button
                    onClick={() => setActiveTab('audit-logs')}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700"
                  >
                    View All Logs →
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Entity</th>
                        <th className="p-3">User</th>
                        <th className="p-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                      {recentActions.map((log: any) => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-slate-500 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{log.action}</td>
                          <td className="p-3 text-slate-600">{log.entity_type} #{log.entity_id || '-'}</td>
                          <td className="p-3 text-slate-600">{log.user_email || 'System'}</td>
                          <td className="p-3 text-slate-500 max-w-xs truncate">
                            {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS DIRECTORY */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-600" />
                    {t.admin.users} ({userPagination.total})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manage accounts, roles, access statuses, and university assignments.
                  </p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <select
                    value={userRoleFilter}
                    onChange={(e) => {
                      setUserRoleFilter(e.target.value);
                      setUserPage(1);
                    }}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <option value="">{t.admin.allRoles}</option>
                    <option value="student">Student</option>
                    <option value="organizer">Organizer</option>
                    <option value="university_admin">University Admin</option>
                    {user?.role === 'platform_admin' && <option value="platform_admin">Platform Admin</option>}
                  </select>

                  <div className="relative">
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                      placeholder={t.admin.searchUsers}
                      className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Institution</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Last Login</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{u.full_name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{u.email}</div>
                        </td>
                        <td className="p-3 text-slate-600">
                          {u.university_name_en || 'Global Platform'}
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          {u.is_active ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                              <Check className="w-3 h-3 text-emerald-500" /> Active
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                              <X className="w-3 h-3 text-rose-500" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedUserForRole(u);
                                setNewRoleSelect(u.role);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors"
                            >
                              {t.admin.changeRole}
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                                u.is_active
                                  ? 'border border-rose-200 text-rose-700 hover:bg-rose-50'
                                  : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {u.is_active ? t.admin.deactivate : t.admin.activate}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <div>Page {userPage} of {userPagination.totalPages || 1}</div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={userPage <= 1}
                    onClick={() => setUserPage(userPage - 1)}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={userPage >= userPagination.totalPages}
                    onClick={() => setUserPage(userPage + 1)}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Role Change Modal */}
              {selectedUserForRole && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Change Role for {selectedUserForRole.full_name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Current role: <span className="font-bold font-mono">{selectedUserForRole.role}</span>
                    </p>
                    <select
                      value={newRoleSelect}
                      onChange={(e) => setNewRoleSelect(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="student">Student</option>
                      <option value="organizer">Organizer</option>
                      <option value="university_admin">University Admin</option>
                      {user?.role === 'platform_admin' && (
                        <option value="platform_admin">Platform Admin</option>
                      )}
                    </select>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setSelectedUserForRole(null)}
                        className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        onClick={handleUpdateUserRole}
                        className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold"
                      >
                        {t.common.save}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ROLES & PERMISSIONS MATRIX */}
          {activeTab === 'roles' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-brand-600" />
                  Role-Based Access Control (RBAC) Permission Matrix
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Specification Section 3 permission matrix and multi-university tenant isolation policy.
                </p>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Platform Capability</th>
                      <th className="p-3 text-center">Visitor</th>
                      <th className="p-3 text-center">Student</th>
                      <th className="p-3 text-center">Organizer</th>
                      <th className="p-3 text-center">University Admin</th>
                      <th className="p-3 text-center">Platform Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    <tr>
                      <td className="p-3 font-bold text-slate-900">View Public Map, Buildings & Events</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Manage Own Profile & Security</td>
                      <td className="p-3 text-center text-slate-300">No</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Register & Cancel Event Attendance</td>
                      <td className="p-3 text-center text-slate-300">No</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Publish & Manage Assigned Events</td>
                      <td className="p-3 text-center text-slate-300">No</td>
                      <td className="p-3 text-center text-slate-300">No</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Own Events</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Own University</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">All Universities</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Approve / Reject University Events</td>
                      <td className="p-3 text-center text-slate-300">No</td>
                      <td className="p-3 text-center text-slate-300">No</td>
                      <td className="p-3 text-center text-slate-300">No</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Own University</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">All Universities</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Correct GPS Coordinates & Manage Buildings</td>
                      <td className="p-3 text-center text-slate-300">No</td>
                      <td className="p-3 text-center text-slate-300">No</td>
                      <td className="p-3 text-center text-slate-300">No</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Own University</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">All Universities</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Manage Users & Assign Roles</td>
                      <td className="p-3 text-center text-slate-300">No</td>
                      <td className="p-3 text-center text-slate-300">No</td>
                      <td className="p-3 text-center text-slate-300">No</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Own University (Non-Admin)</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Global Unrestricted</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Access Immutable System Audit Logs</td>
                      <td className="p-3 text-center text-slate-300">No</td>
                      <td className="p-3 text-center text-slate-300">No</td>
                      <td className="p-3 text-center text-slate-300">No</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Own University Scope</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Platform-Wide</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: UNIVERSITIES OVERVIEW */}
          {activeTab === 'universities' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-brand-600" />
                {t.admin.universities} ({universities.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {universities.map((uni) => (
                  <div key={uni.id} className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
                        {uni.acronym}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900">{uni.name_en}</h4>
                    <p className="text-xs text-slate-500">{uni.name_km}</p>
                    <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-200/60">
                      <span>Campuses: {uni.campuses_count || 1} • Facilities: {uni.buildings_count || 0}</span>
                      <a
                        href={uni.official_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 font-bold flex items-center gap-1"
                      >
                        Website <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: BUILDINGS AND MAP DATA */}
          {activeTab === 'buildings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-brand-600" />
                    Facility Coordinates & Verification Management
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify OpenStreetMap coordinates and manage campus building records.
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
                    <label className="text-xs font-bold text-slate-700">Select Facility to Edit ({buildings.length})</label>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {buildings.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => handleSelectBuilding(b.id)}
                          className={`p-3 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            selectedBuildingId === b.id ? 'bg-brand-50 text-brand-900 font-semibold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="font-bold">{b.name_en} ({b.code || 'FACILITY'})</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {Number(b.latitude).toFixed(5)}, {Number(b.longitude).toFixed(5)} • {b.category}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              b.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {b.verification_status}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBuilding(b);
                              }}
                              disabled={deletingBuildingId === b.id}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Edit Form */}
                  <form onSubmit={handleUpdateCoordinates} className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="font-bold text-slate-800">
                      {selectedBuildingId ? `Edit Coordinates for #${selectedBuildingId}` : 'Select a facility on the left'}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-600">Latitude</label>
                        <input
                          type="text"
                          required
                          disabled={!selectedBuildingId}
                          value={coordForm.latitude}
                          onChange={(e) => setCoordForm({ ...coordForm, latitude: e.target.value })}
                          className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-600">Longitude</label>
                        <input
                          type="text"
                          required
                          disabled={!selectedBuildingId}
                          value={coordForm.longitude}
                          onChange={(e) => setCoordForm({ ...coordForm, longitude: e.target.value })}
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
                        <option value="verified">Verified (Confirmed OpenStreetMap GPS)</option>
                        <option value="unverified">Unverified (Pending inspection)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-600">Audit Justification</label>
                      <input
                        type="text"
                        disabled={!selectedBuildingId}
                        value={coordForm.reason}
                        onChange={(e) => setCoordForm({ ...coordForm, reason: e.target.value })}
                        className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!selectedBuildingId}
                      className="w-full py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-4 h-4" /> Save & Log Verification Audit
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: EVENTS & APPROVALS */}
          {activeTab === 'events' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-brand-600" />
                    {t.admin.events} ({eventPagination.total})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review and authorize campus event submissions before public listing.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={eventStatusFilter}
                    onChange={(e) => {
                      setEventStatusFilter(e.target.value);
                      setEventPage(1);
                    }}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <option value="">All Approval Statuses</option>
                    <option value="pending">Pending Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <div className="relative">
                    <input
                      type="text"
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchEvents()}
                      placeholder={t.admin.searchEvents}
                      className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Events Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Event Title</th>
                      <th className="p-3">Organizer</th>
                      <th className="p-3">Campus / Venue</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {eventsList.map((ev) => {
                      const approval = ev.approval_status || 'approved';
                      const isProcessing = approvingId === ev.id;
                      return (
                        <tr key={ev.id} className="hover:bg-slate-50/50">
                          <td className="p-3 max-w-xs">
                            <div className="font-bold text-slate-900 truncate">
                              {language === 'km' ? ev.title_km : ev.title_en}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              Capacity: {ev.registered_count} / {ev.capacity} • {ev.category}
                            </div>
                            {ev.rejection_reason && (
                              <div className="text-[10px] text-rose-600 italic mt-0.5">
                                Reason: {ev.rejection_reason}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">{ev.organizer_name || 'Organizer'}</td>
                          <td className="p-3 text-slate-600">{ev.building_name_en || ev.campus_name_en}</td>
                          <td className="p-3 text-slate-500 whitespace-nowrap">
                            {new Date(ev.start_time).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            {approval === 'approved' && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-500" /> Approved
                              </span>
                            )}
                            {approval === 'pending' && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-500" /> Pending Review
                              </span>
                            )}
                            {approval === 'rejected' && (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <X className="w-3 h-3 text-rose-500" /> Rejected
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {approval !== 'approved' && (
                                <button
                                  disabled={isProcessing}
                                  onClick={() => handleApproveEvent(ev.id)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50"
                                >
                                  <ThumbsUp className="w-3 h-3" /> Approve
                                </button>
                              )}
                              {approval !== 'rejected' && (
                                <button
                                  disabled={isProcessing}
                                  onClick={() => handleRejectEvent(ev.id)}
                                  className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center gap-1 transition-colors disabled:opacity-50"
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

              {/* Pagination */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <div>Page {eventPage} of {eventPagination.totalPages || 1}</div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={eventPage <= 1}
                    onClick={() => setEventPage(eventPage - 1)}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={eventPage >= eventPagination.totalPages}
                    onClick={() => setEventPage(eventPage + 1)}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: EVENT REGISTRATIONS */}
          {activeTab === 'registrations' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-brand-600" />
                  {t.admin.registrations} ({regPagination.total})
                </h3>
                <p className="text-xs text-slate-500">
                  Comprehensive student attendance and capacity bookings overview.
                </p>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Student</th>
                      <th className="p-3">Event</th>
                      <th className="p-3">Registered At</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {registrationsList.map((r) => (
                      <tr key={r.registration_id} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{r.student_name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{r.student_email}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{r.event_title_en}</div>
                          <div className="text-[11px] text-slate-500">
                            {new Date(r.start_time).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {new Date(r.registered_at).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <div>Page {regPage} of {regPagination.totalPages || 1}</div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={regPage <= 1}
                    onClick={() => setRegPage(regPage - 1)}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={regPage >= regPagination.totalPages}
                    onClick={() => setRegPage(regPage + 1)}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: AUDIT LOGS */}
          {activeTab === 'audit-logs' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  {t.admin.auditLogs} ({auditPagination.total})
                </h3>
                <p className="text-xs text-slate-500">
                  Immutable security and operational log trail.
                </p>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Entity</th>
                      <th className="p-3">Actor</th>
                      <th className="p-3">Institution</th>
                      <th className="p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                    {auditLogsList.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-slate-500 whitespace-nowrap">
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

              {/* Pagination */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <div>Page {auditPage} of {auditPagination.totalPages || 1}</div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage(auditPage - 1)}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={auditPage >= auditPagination.totalPages}
                    onClick={() => setAuditPage(auditPage + 1)}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-600" />
                Administrative & Security Settings
              </h3>
              <p className="text-xs text-slate-500">
                Logged in as <span className="font-bold">{user?.fullName}</span> ({user?.email}) with role <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded">{user?.role}</span>.
              </p>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
                <div className="font-bold text-slate-800">Security Architecture Status</div>
                <div className="flex items-center gap-2 text-emerald-700">
                  <Check className="w-4 h-4" /> HttpOnly SameSite Session Cookies & Bearer Authentication Active
                </div>
                <div className="flex items-center gap-2 text-emerald-700">
                  <Check className="w-4 h-4" /> Rate Limiting Active on Authentication Routes (100 req / 15m)
                </div>
                <div className="flex items-center gap-2 text-emerald-700">
                  <Check className="w-4 h-4" /> Multi-University Tenant Isolation Middleware Enforced
                </div>
                <div className="flex items-center gap-2 text-emerald-700">
                  <Check className="w-4 h-4" /> High-concurrency Transactional Locking (`FOR UPDATE`) on Event Bookings
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
