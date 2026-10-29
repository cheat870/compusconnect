import React, { useState } from 'react';
import { useLanguage } from '../i18n/context.js';
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Search,
  ExternalLink,
  Compass,
  Layers,
  ArrowRight
} from 'lucide-react';

interface FacilitiesPageProps {
  buildings: any[];
  onFocusBuildingOnMap: (campusId: number, buildingId: number) => void;
}

export const FacilitiesPage: React.FC<FacilitiesPageProps> = ({
  buildings,
  onFocusBuildingOnMap,
}) => {
  const { language, t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filtered = buildings.filter((b) => {
    const matchesCategory = selectedCategory === 'all' || b.category === selectedCategory;
    const query = search.toLowerCase().trim();
    if (!query) return matchesCategory;

    const nameEn = b.name_en.toLowerCase();
    const nameKm = b.name_km.toLowerCase();
    const code = (b.code || '').toLowerCase();
    return matchesCategory && (nameEn.includes(query) || nameKm.includes(query) || code.includes(query));
  });

  const verifiedTotal = buildings.filter((b) => b.verification_status === 'verified').length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900">
              {language === 'km' ? 'បញ្ជីអគារ និងទីតាំងក្នុងបរិវេណ' : 'Campus Facilities Directory'}
            </h2>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {verifiedTotal} {t.common.verified}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'km'
              ? 'រុករកអគារសិក្សា បណ្ណាល័យ មជ្ឈមណ្ឌលសហប្រតិបត្តិការ និងចំណតយានយន្តផ្លូវការ'
              : 'Verified facilities across Royal University of Phnom Penh (RUPP) campuses.'}
          </p>
        </div>
      </div>

      {/* Search and Category Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by facility name, code, department..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {[
            { id: 'all', label: t.map.allCategories },
            { id: 'academic', label: t.map.academic },
            { id: 'library', label: t.map.library },
            { id: 'cooperation_center', label: t.map.cooperationCenter },
            { id: 'lab', label: t.map.lab },
            { id: 'administrative', label: t.map.administrative },
            { id: 'canteen', label: t.map.canteen },
            { id: 'parking', label: t.map.parking },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Facilities Cards Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-bold">{t.map.noBuildingsFound}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((b) => {
            const isVerified = b.verification_status === 'verified';
            const lat = Number(b.latitude);
            const lng = Number(b.longitude);
            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">
                      {b.code || 'FACILITY'}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isVerified ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {isVerified ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                      {isVerified ? t.common.verified : t.common.unverified}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                      {language === 'km' ? b.name_km : b.name_en}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {language === 'km' ? b.name_en : b.name_km}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {(language === 'km' ? b.description_km : b.description_en) || 'Official university campus building.'}
                  </p>

                  <div className="pt-2 text-[11px] text-slate-500 font-mono space-y-1">
                    <div>GPS: {lat.toFixed(5)}, {lng.toFixed(5)}</div>
                    <div className="text-slate-400">Floors: {b.floors || 1} • Category: {b.category}</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-slate-700 font-semibold flex items-center gap-1"
                  >
                    Directions <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => onFocusBuildingOnMap(b.campus_id || 1, b.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    {t.map.viewOnMap}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FacilitiesPage;
