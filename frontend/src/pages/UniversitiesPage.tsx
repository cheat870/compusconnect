import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/context.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { Building2, CheckCircle2, ExternalLink, Plus, MapPin, Search } from 'lucide-react';
import { FALLBACK_UNIVERSITIES } from '../data/fallbackData.js';

interface UniversitiesPageProps {
  onSelectUniversity?: (id: number) => void;
  onNavigate?: (tab: string) => void;
}

export const UniversitiesPage: React.FC<UniversitiesPageProps> = ({
  onSelectUniversity,
  onNavigate,
}) => {
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const [universities, setUniversities] = useState<any[]>(FALLBACK_UNIVERSITIES);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<'all' | 'phnom_penh' | 'provinces'>('all');
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
      if (res.data.success && res.data.data?.length > 0) {
        setUniversities(res.data.data);
      } else {
        setUniversities(FALLBACK_UNIVERSITIES);
      }
    } catch (err) {
      console.warn('Failed to load universities from API, using verified fallback:', err);
      setUniversities(FALLBACK_UNIVERSITIES);
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

  const isPhnomPenh = (u: any) =>
    (u.address_en && u.address_en.toLowerCase().includes('phnom penh')) ||
    (u.address_km && u.address_km.includes('ភ្នំពេញ'));

  const filtered = universities.filter((u) => {
    const matchesSearch =
      u.name_en.toLowerCase().includes(search.toLowerCase()) ||
      u.name_km.includes(search) ||
      u.acronym.toLowerCase().includes(search.toLowerCase()) ||
      (u.address_en && u.address_en.toLowerCase().includes(search.toLowerCase())) ||
      (u.address_km && u.address_km.includes(search));

    if (!matchesSearch) return false;

    if (regionFilter === 'phnom_penh') return isPhnomPenh(u);
    if (regionFilter === 'provinces') return !isPhnomPenh(u);
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900">
              {language === 'km' ? 'បញ្ជីសាកលវិទ្យាល័យ និងគ្រឹះស្ថានឧត្តមសិក្សានៅកម្ពុជា' : 'Cambodian Higher Education Institutions'}
            </h2>
            <span className="text-xs font-black bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
              {universities.length} {language === 'km' ? 'សាកលវិទ្យាល័យ' : 'Institutions'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'km'
              ? 'ប្រព័ន្ធពហុសាកលវិទ្យាល័យបើកចំហរទូទាំងប្រទេសកម្ពុជា ដោយមាន RUPP ជាគ្រឹះស្ថានសាកល្បងទីមួយ'
              : 'Nationwide multi-institution directory covering universities across Cambodia with RUPP as first pilot.'}
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

      {/* Search & Region Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-md w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              language === 'km'
                ? 'ស្វែងរកតាមឈ្មោះសាកលវិទ្យាល័យ អក្សរកាត់ ឬទីតាំង...'
                : 'Search by university name, acronym, or location...'
            }
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Region Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setRegionFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              regionFilter === 'all'
                ? 'bg-white text-brand-700 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {language === 'km' ? 'ទាំងអស់' : 'All'} ({universities.length})
          </button>
          <button
            onClick={() => setRegionFilter('phnom_penh')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              regionFilter === 'phnom_penh'
                ? 'bg-white text-brand-700 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {language === 'km' ? 'រាជធានីភ្នំពេញ' : 'Phnom Penh'} ({universities.filter(isPhnomPenh).length})
          </button>
          <button
            onClick={() => setRegionFilter('provinces')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              regionFilter === 'provinces'
                ? 'bg-white text-brand-700 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {language === 'km' ? 'តាមបណ្តាខេត្ត' : 'Provinces'} ({universities.filter((u) => !isPhnomPenh(u)).length})
          </button>
        </div>
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
                } flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow`}
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

                  {/* Address */}
                  {(u.address_km || u.address_en) && (
                    <div className="flex items-start gap-1.5 mt-2.5 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{language === 'km' ? u.address_km : u.address_en}</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 mt-2.5 line-clamp-3 leading-relaxed">
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

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (onSelectUniversity) onSelectUniversity(u.id);
                        if (onNavigate) onNavigate('campuses');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs flex items-center gap-1.5 transition-colors border border-brand-200"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {language === 'km' ? 'មើលលើផែនទី' : 'View Campus Map'}
                    </button>

                    <a
                      href={u.official_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-600 hover:text-brand-600 font-semibold flex items-center gap-1 px-2 py-1.5"
                    >
                      Official Site <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <span className="text-slate-400 text-[10px] truncate max-w-[160px]" title={u.source_url}>
                    {u.phone || u.email || 'Verified Data'}
                  </span>
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
