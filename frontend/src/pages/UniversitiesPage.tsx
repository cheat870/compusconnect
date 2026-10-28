import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/context.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { Building2, CheckCircle2, ExternalLink, Plus, MapPin, Search } from 'lucide-react';

export const UniversitiesPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for adding university
  const [newUni, setNewUni] = useState({
    slug: '',
    nameEn: '',
    nameKm: '',
    acronym: '',
    officialWebsite: '',
    descriptionEn: '',
    descriptionKm: '',
    sourceUrl: '',
  });

  const fetchUniversities = async () => {
    try {
      setLoading(true);
      const res = await api.get('/universities');
      if (res.data.success) {
        setUniversities(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load universities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversities();
  }, []);

  const handleCreateUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/universities', {
        ...newUni,
        sourceType: 'official_website',
        verificationStatus: 'verified',
        dataClassification: 'verified_public',
      });
      if (res.data.success) {
        setShowAddModal(false);
        setNewUni({
          slug: '',
          nameEn: '',
          nameKm: '',
          acronym: '',
          officialWebsite: '',
          descriptionEn: '',
          descriptionKm: '',
          sourceUrl: '',
        });
        fetchUniversities();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create university');
    }
  };

  const filtered = universities.filter(
    (u) =>
      u.name_en.toLowerCase().includes(search.toLowerCase()) ||
      u.name_km.includes(search) ||
      u.acronym.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            {language === 'km' ? 'បញ្ជីសាកលវិទ្យាល័យ និងគ្រឹះស្ថានឧត្តមសិក្សា' : 'Higher Education Institutions'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'km'
              ? 'ប្រព័ន្ធពហុសាកលវិទ្យាល័យបើកចំហរ ដោយមាន RUPP ជាគ្រឹះស្ថានសាកល្បងទីមួយ'
              : 'Multi-institution directory with Royal University of Phnom Penh (RUPP) as first pilot.'}
          </p>
        </div>

        {user?.role === 'platform_admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Institution
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by university name or acronym..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
      </div>

      {/* Institution Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">{t.common.loading}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((u) => {
            const isPilot = u.slug === 'rupp';
            return (
              <div
                key={u.id}
                className={`p-6 rounded-2xl bg-white border ${
                  isPilot ? 'border-brand-300 ring-2 ring-brand-100 shadow-md' : 'border-slate-200 shadow-xs'
                } flex flex-col justify-between space-y-4`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center">
                        {u.acronym}
                      </span>
                      {isPilot && (
                        <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                          First Pilot Institution
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {u.verification_status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mt-3 leading-snug">
                    {language === 'km' ? u.name_km : u.name_en}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{u.name_en} ({u.acronym})</p>

                  <p className="text-xs text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                    {language === 'km' ? u.description_km : u.description_en}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="font-bold text-slate-800">{u.campuses_count || 1}</span>
                      <p className="text-[10px] text-slate-400">Campuses</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="font-bold text-slate-800">{u.buildings_count || 0}</span>
                      <p className="text-[10px] text-slate-400">Facilities</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="font-bold text-slate-800">{u.events_count || 0}</span>
                      <p className="text-[10px] text-slate-400">Events</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px] truncate max-w-[200px]" title={u.source_url}>
                    Source: {u.source_url}
                  </span>
                  <a
                    href={u.official_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 font-bold hover:underline flex items-center gap-1 shrink-0"
                  >
                    Official Site <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add University Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add New University (Dynamic Multi-University)</h3>
            <form onSubmit={handleCreateUniversity} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Acronym</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NUM"
                  value={newUni.acronym}
                  onChange={(e) => setNewUni({ ...newUni, acronym: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Slug (Unique identifier)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. national-university-of-management"
                  value={newUni.slug}
                  onChange={(e) => setNewUni({ ...newUni, slug: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Name (English)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National University of Management"
                  value={newUni.nameEn}
                  onChange={(e) => setNewUni({ ...newUni, nameEn: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Name (Khmer)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. សាកលវិទ្យាល័យជាតិគ្រប់គ្រង"
                  value={newUni.nameKm}
                  onChange={(e) => setNewUni({ ...newUni, nameKm: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Official Website URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://num.edu.kh"
                  value={newUni.officialWebsite}
                  onChange={(e) => setNewUni({ ...newUni, officialWebsite: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Source of Truth URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://num.edu.kh/"
                  value={newUni.sourceUrl}
                  onChange={(e) => setNewUni({ ...newUni, sourceUrl: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold"
                >
                  Add Institution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversitiesPage;
