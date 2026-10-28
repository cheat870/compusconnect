import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useLanguage } from '../i18n/context.js';
import { MapPin, Navigation, CheckCircle2, AlertCircle, Calendar, ExternalLink, Compass } from 'lucide-react';

interface Building {
  id: number;
  code?: string;
  name_en: string;
  name_km: string;
  category: string;
  description_en?: string;
  description_km?: string;
  latitude: number | string;
  longitude: number | string;
  verification_status: 'verified' | 'unverified';
  source_url?: string;
}

interface EventItem {
  id: number;
  slug: string;
  title_en: string;
  title_km: string;
  category: string;
  building_id?: number;
  building_latitude?: number | string;
  building_longitude?: number | string;
  start_time: string;
}

interface Campus {
  id: number;
  name_en: string;
  name_km: string;
  slug: string;
  latitude: number | string;
  longitude: number | string;
}

interface CampusMapProps {
  campuses: Campus[];
  selectedCampusId: number;
  onSelectCampus: (campusId: number) => void;
  buildings: Building[];
  events?: EventItem[];
  onSelectEvent?: (eventId: number) => void;
  activeBuildingId?: number | null;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  campuses,
  selectedCampusId,
  onSelectCampus,
  buildings,
  events = [],
  onSelectEvent,
  activeBuildingId,
}) => {
  const { language, t } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  const currentCampus = campuses.find((c) => c.id === selectedCampusId) || campuses[0];

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = currentCampus ? Number(currentCampus.latitude) : 11.56845;
      const initialLng = currentCampus ? Number(currentCampus.longitude) : 104.89115;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 17,
        zoomControl: true,
      });

      // Configurable OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | RUPP Pilot',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup on unmount
    };
  }, []);

  // Pan to campus when campus changes
  useEffect(() => {
    if (mapInstanceRef.current && currentCampus) {
      mapInstanceRef.current.setView(
        [Number(currentCampus.latitude), Number(currentCampus.longitude)],
        17,
        { animate: true }
      );
    }
  }, [selectedCampusId]);

  // Filter buildings
  const filteredBuildings = buildings.filter((b) => {
    const matchesCategory = selectedCategory === 'all' || b.category === selectedCategory;
    const nameMatch =
      b.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.name_km.includes(searchQuery) ||
      (b.code && b.code.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && nameMatch;
  });

  // Render Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // 1. Add Campus Origin Marker
    if (currentCampus) {
      const campusIcon = L.divIcon({
        className: 'campus-marker',
        html: `<div class="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-lg border-2 border-white ring-2 ring-blue-300">🏛️</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const campusMarker = L.marker(
        [Number(currentCampus.latitude), Number(currentCampus.longitude)],
        { icon: campusIcon }
      ).bindPopup(`
        <div class="p-3">
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">Campus Center</span>
          <h4 class="font-bold text-sm mt-1 text-slate-800">${language === 'km' ? currentCampus.name_km : currentCampus.name_en}</h4>
          <p class="text-xs text-slate-500 mt-0.5">Lat: ${Number(currentCampus.latitude).toFixed(5)}, Lng: ${Number(currentCampus.longitude).toFixed(5)}</p>
        </div>
      `);
      markersLayerRef.current.addLayer(campusMarker);
    }

    // 2. Add Building Markers
    filteredBuildings.forEach((b) => {
      const lat = Number(b.latitude);
      const lng = Number(b.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const isVerified = b.verification_status === 'verified';
      const isSelected = activeBuildingId === b.id || selectedBuilding?.id === b.id;

      // Color coding based on facility category
      let categoryColor = '#3b82f6'; // default blue
      let iconSymbol = '🏢';
      if (b.category === 'library') {
        categoryColor = '#10b981'; // emerald
        iconSymbol = '📚';
      } else if (b.category === 'cooperation_center') {
        categoryColor = '#8b5cf6'; // purple
        iconSymbol = '🤝';
      } else if (b.category === 'lab') {
        categoryColor = '#f59e0b'; // amber
        iconSymbol = '🔬';
      } else if (b.category === 'canteen') {
        categoryColor = '#f97316'; // orange
        iconSymbol = '🍲';
      } else if (b.category === 'sports') {
        categoryColor = '#ef4444'; // red
        iconSymbol = '⚽';
      }

      const buildingIcon = L.divIcon({
        className: 'building-marker',
        html: `
          <div class="flex flex-col items-center">
            <div style="background-color: ${categoryColor};" class="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-md border-2 ${isSelected ? 'border-amber-400 ring-4 ring-amber-200' : 'border-white'} transition-transform hover:scale-110">
              ${iconSymbol}
            </div>
            <span class="text-[10px] font-bold px-1.5 py-0.2 mt-0.5 rounded shadow-sm bg-white text-slate-700 whitespace-nowrap border border-slate-200">
              ${b.code || (language === 'km' ? b.name_km.substring(0, 10) : b.name_en.substring(0, 10))}
            </span>
          </div>
        `,
        iconSize: [40, 48],
        iconAnchor: [20, 24],
      });

      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      const popupHtml = `
        <div class="p-3 text-slate-800 font-sans max-w-xs">
          <div class="flex items-center gap-1.5 mb-1.5">
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} flex items-center gap-1">
              ${isVerified ? '✓ ' + t.common.verified : '⚠ ' + t.common.unverified}
            </span>
            ${b.code ? `<span class="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">${b.code}</span>` : ''}
          </div>
          <h4 class="font-bold text-sm text-slate-900 leading-snug">${language === 'km' ? b.name_km : b.name_en}</h4>
          <p class="text-xs text-slate-600 mt-1 line-clamp-2">${(language === 'km' ? b.description_km : b.description_en) || ''}</p>
          <div class="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-400 font-mono text-[10px]">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              ${t.map.getDirections} ↗
            </a>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: buildingIcon }).bindPopup(popupHtml);
      marker.on('click', () => {
        setSelectedBuilding(b);
      });

      markersLayerRef.current!.addLayer(marker);

      if (activeBuildingId === b.id) {
        marker.openPopup();
        mapInstanceRef.current?.setView([lat, lng], 18, { animate: true });
      }
    });

    // 3. Add Event Markers linked to published events
    events.forEach((ev) => {
      const lat = Number(ev.building_latitude);
      const lng = Number(ev.building_longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const eventIcon = L.divIcon({
        className: 'event-marker',
        html: `
          <div class="relative flex items-center justify-center animate-bounce">
            <div class="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shadow-lg border-2 border-white ring-2 ring-rose-300">
              📅
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const eventPopup = `
        <div class="p-3 text-slate-800 font-sans max-w-xs">
          <span class="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">Event</span>
          <h4 class="font-bold text-sm text-slate-900 mt-1">${language === 'km' ? ev.title_km : ev.title_en}</h4>
          <p class="text-xs text-slate-500 mt-1">Start: ${new Date(ev.start_time).toLocaleDateString()}</p>
        </div>
      `;

      const eventMarker = L.marker([lat, lng], { icon: eventIcon }).bindPopup(eventPopup);
      eventMarker.on('click', () => {
        if (onSelectEvent) onSelectEvent(ev.id);
      });

      markersLayerRef.current!.addLayer(eventMarker);
    });
  }, [filteredBuildings, events, selectedCampusId, language, activeBuildingId]);

  const centerOnBuilding = (b: Building) => {
    setSelectedBuilding(b);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([Number(b.latitude), Number(b.longitude)], 18, { animate: true });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[750px]">
      {/* Sidebar Controls & Directory */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 bg-slate-50/50">
        <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-brand-600" />
              {t.map.selectCampus}
            </h3>
            <span className="text-xs bg-brand-50 text-brand-700 font-medium px-2 py-0.5 rounded-full">
              {filteredBuildings.length} Facilities
            </span>
          </div>

          {/* Campus Selector */}
          <select
            value={selectedCampusId}
            onChange={(e) => onSelectCampus(Number(e.target.value))}
            aria-label="Campus Selector"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {language === 'km' ? c.name_km : c.name_en}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.map.searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { id: 'all', label: t.map.allCategories },
              { id: 'cooperation_center', label: t.map.cooperationCenter },
              { id: 'academic', label: t.map.academic },
              { id: 'library', label: t.map.library },
              { id: 'lab', label: t.map.lab },
              { id: 'canteen', label: t.map.canteen },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Buildings List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredBuildings.length === 0 ? (
            <div className="text-center py-10 px-4">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">{t.map.noBuildingsFound}</p>
            </div>
          ) : (
            filteredBuildings.map((b) => {
              const isVerified = b.verification_status === 'verified';
              const isSelected = selectedBuilding?.id === b.id;

              return (
                <div
                  key={b.id}
                  onClick={() => centerOnBuilding(b)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-brand-50/70 border-brand-300 ring-1 ring-brand-400 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {b.code && (
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {b.code}
                        </span>
                      )}
                      <h4 className="font-bold text-xs text-slate-900 mt-1 leading-snug">
                        {language === 'km' ? b.name_km : b.name_en}
                      </h4>
                    </div>
                    {isVerified ? (
                      <span title={t.map.verifiedLocation}>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      </span>
                    ) : (
                      <span title={t.map.unverifiedLocation}>
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {(language === 'km' ? b.description_km : b.description_en) || ''}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-400 font-mono">
                      {Number(b.latitude).toFixed(4)}, {Number(b.longitude).toFixed(4)}
                    </span>
                    <span className="text-brand-600 font-medium hover:underline flex items-center gap-0.5">
                      {t.map.viewOnMap}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Map View Pane */}
      <div className="flex-1 relative flex flex-col">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Map Legend Overlay */}
        <div className="absolute bottom-4 right-4 z-10 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200 text-[11px] space-y-1.5 pointer-events-auto">
          <div className="font-bold text-slate-800 text-xs mb-1">RUPP Map Legend</div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-full bg-blue-700"></span> Campus Anchor
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-full bg-purple-600"></span> CJCC / CKCC Centers
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Library (Hun Sen)
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span> STEM Laboratories
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-full bg-rose-600"></span> Published Event Venue
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampusMap;
