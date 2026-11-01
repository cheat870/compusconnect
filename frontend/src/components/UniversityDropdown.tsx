import React, { useState, useRef, useEffect } from 'react';
import { GraduationCap, ChevronDown, Search, Check, X } from 'lucide-react';
import { useLanguage } from '../i18n/context.js';

export interface UniversityItem {
  id: number;
  slug: string;
  name_en: string;
  name_km: string;
  acronym: string;
  official_website?: string;
  verification_status?: string;
}

interface UniversityDropdownProps {
  universities: UniversityItem[];
  selectedUniversityId: number;
  onSelectUniversity: (id: number) => void;
  compactOnly?: boolean;
}

export const UniversityDropdown: React.FC<UniversityDropdownProps> = ({
  universities,
  selectedUniversityId,
  onSelectUniversity,
  compactOnly = false,
}) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedUni = universities.find((u) => u.id === selectedUniversityId) || universities[0];

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => inputRef.current?.focus(), 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredUnis = universities.filter((u) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase().trim();
    return (
      u.acronym?.toLowerCase().includes(term) ||
      u.name_en?.toLowerCase().includes(term) ||
      u.name_km?.toLowerCase().includes(term)
    );
  });

  const handleSelect = (id: number) => {
    onSelectUniversity(id);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button - Optimized for touch on iOS and desktop click */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 sm:gap-1.5 bg-slate-50 hover:bg-slate-100/90 border ${
          isOpen ? 'border-brand-500 ring-2 ring-brand-100 bg-white' : 'border-slate-200 hover:border-brand-300'
        } rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-2xs select-none shrink-0 max-w-[140px] sm:max-w-none`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-600 shrink-0" />
        <span className="font-black text-brand-900 tracking-tight text-[11px] sm:text-xs truncate">
          {selectedUni?.acronym || 'RUPP'}
        </span>
        {!compactOnly && (
          <span className="hidden xl:inline text-slate-600 font-medium truncate max-w-[130px]">
            — {language === 'km' ? selectedUni?.name_km : selectedUni?.name_en}
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-brand-600' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Panel (Responsive: fixed centered on iPhone, absolute on Desktop/Tablet) */}
      {isOpen && (
        <div className="fixed inset-x-3 top-20 sm:absolute sm:inset-x-auto sm:left-0 sm:top-auto sm:mt-2 w-auto sm:w-96 max-w-sm sm:max-w-none bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  language === 'km'
                    ? 'ស្វែងរកសាកលវិទ្យាល័យ (៣៧ គ្រឹះស្ថាន)...'
                    : 'Search Cambodian universities (37)...'
                }
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              <span>{filteredUnis.length} {language === 'km' ? 'គ្រឹះស្ថាន' : 'Institutions'}</span>
              <span>{language === 'km' ? 'ផ្ទៀងផ្ទាត់រួច' : 'Verified Public'}</span>
            </div>
          </div>

          {/* University List */}
          <div className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredUnis.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                {language === 'km' ? 'រកមិនឃើញសាកលវិទ្យាល័យនេះទេ' : 'No matching universities found'}
              </div>
            ) : (
              filteredUnis.map((uni) => {
                const isSelected = uni.id === selectedUniversityId;
                return (
                  <button
                    key={uni.id}
                    type="button"
                    onClick={() => handleSelect(uni.id)}
                    className={`w-full flex items-start gap-2.5 sm:gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-brand-50/80 text-brand-950 font-semibold'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black tracking-wide uppercase font-mono ${
                        isSelected
                          ? 'bg-brand-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {uni.acronym}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold leading-snug truncate">
                        {language === 'km' ? uni.name_km : uni.name_en}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {language === 'km' ? uni.name_en : uni.name_km}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-brand-600 shrink-0 self-center" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversityDropdown;
