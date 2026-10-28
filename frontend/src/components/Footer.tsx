import React from 'react';
import { useLanguage } from '../i18n/context.js';
import { ShieldCheck, ExternalLink, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const { language, t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-400 text-xs py-10 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 text-white font-extrabold text-base mb-2">
              <span className="w-6 h-6 rounded-lg bg-brand-500 text-white flex items-center justify-center text-xs">
                CC
              </span>
              CampusConnect MVP
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Open multi-university campus directory, venue locator, and event coordination platform. Initial pilot established with the Royal University of Phnom Penh (RUPP).
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              Pilot Institution Information
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.rupp.edu.kh/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white flex items-center gap-1 transition-colors"
                >
                  Official RUPP Portal <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.cjcc.edu.kh/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white flex items-center gap-1 transition-colors"
                >
                  CJCC Official Website <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.openstreetmap.org/way/252392612"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white flex items-center gap-1 transition-colors"
                >
                  OpenStreetMap Verified Coordinates <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Data Source Integrity
            </h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              All institution and building data are verified against public records and OpenStreetMap datasets. Uncertain locations are marked unverified. Does not claim university endorsement or official partnership unless explicitly confirmed.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <p>© 2026 CampusConnect Platform. Designed for Cambodian Higher Education.</p>
          <p className="flex items-center gap-1">
            Built with modern multi-tenant architecture & Leaflet maps.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
