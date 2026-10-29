import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { useLanguage } from '../i18n/context.js';
import {
  MapPin,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ExternalLink,
  Compass,
  X,
  Search,
  Plus,
  Minus,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
  Car,
  Utensils,
  BookOpen,
  FlaskConical,
  Building,
  Landmark,
  Layers
} from 'lucide-react';

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
  floors?: number;
  is_accessible?: boolean;
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
  const buildingMarkersMapRef = useRef<Map<number, L.Marker>>(new Map());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(activeBuildingId || null);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState<boolean>(true);

  const currentCampus = campuses.find((c) => c.id === selectedCampusId) || campuses[0];

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = currentCampus ? Number(currentCampus.latitude) : 11.56845;
      const initialLng = currentCampus ? Number(currentCampus.longitude) : 104.89115;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 17,
        zoomControl: false, // Custom zoom buttons in UI
      });

      // Configurable OpenStreetMap Tile Provider
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors | RUPP Pilot v2.0',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup
    };
  }, []);

  // Update map view when campus changes
  useEffect(() => {
    if (mapInstanceRef.current && currentCampus) {
      mapInstanceRef.current.setView(
        [Number(currentCampus.latitude), Number(currentCampus.longitude)],
        17,
        { animate: true }
      );
    }
  }, [selectedCampusId]);

  // Synchronize active building prop with local state
  useEffect(() => {
    if (activeBuildingId) {
      setSelectedBuildingId(activeBuildingId);
      focusBuilding(activeBuildingId);
    }
  }, [activeBuildingId]);

  // Calculate facility category counts dynamically
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: buildings.length };
    buildings.forEach((b) => {
      counts[b.category] = (counts[b.category] || 0) + 1;
    });
    return counts;
  }, [buildings]);

  // Filter facilities
  const filteredBuildings = useMemo(() => {
    return buildings.filter((b) => {
      const matchesCategory = selectedCategory === 'all' || b.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesCategory;

      const nameEn = b.name_en.toLowerCase();
      const nameKm = b.name_km.toLowerCase();
      const code = (b.code || '').toLowerCase();
      const matchesSearch = nameEn.includes(query) || nameKm.includes(query) || code.includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [buildings, selectedCategory, searchQuery]);

  // Verified facilities count
  const verifiedCount = buildings.filter((b) => b.verification_status === 'verified').length;

  // Render Markers on Map with Bidirectional Interaction
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    buildingMarkersMapRef.current.clear();

    // 1. Campus Anchor Marker
    if (currentCampus) {
      const campusIcon = L.divIcon({
        className: 'campus-marker',
        html: `
          <div class="w-8 h-8 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-black text-xs shadow-xl border-2 border-white ring-2 ring-blue-300">
            🏛️
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const campusMarker = L.marker(
        [Number(currentCampus.latitude), Number(currentCampus.longitude)],
        { icon: campusIcon }
      ).bindPopup(`
        <div class="p-3 text-slate-800 font-sans">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">Campus Origin</span>
          <h4 class="font-bold text-sm mt-1 text-slate-900">${language === 'km' ? currentCampus.name_km : currentCampus.name_en}</h4>
          <p class="text-xs text-slate-500 mt-0.5">Lat: ${Number(currentCampus.latitude).toFixed(5)}, Lng: ${Number(currentCampus.longitude).toFixed(5)}</p>
        </div>
      `);
      markersLayerRef.current.addLayer(campusMarker);
    }

    // 2. Render Building Markers
    filteredBuildings.forEach((b) => {
      const lat = Number(b.latitude);
      const lng = Number(b.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const isVerified = b.verification_status === 'verified';
      const isSelected = selectedBuildingId === b.id;

      // Color coding & icons per category
      let categoryColor = '#3b82f6'; // blue default
      let iconSymbol = '🏢';
      if (b.category === 'library') {
        categoryColor = '#059669'; // emerald
        iconSymbol = '📚';
      } else if (b.category === 'cooperation_center') {
        categoryColor = '#7c3aed'; // purple
        iconSymbol = '🤝';
      } else if (b.category === 'lab') {
        categoryColor = '#d97706'; // amber
        iconSymbol = '🔬';
      } else if (b.category === 'canteen') {
        categoryColor = '#ea580c'; // orange
        iconSymbol = '🍲';
      } else if (b.category === 'parking') {
        categoryColor = '#475569'; // slate
        iconSymbol = '🅿️';
      } else if (b.category === 'administrative') {
        categoryColor = '#0f766e'; // teal
        iconSymbol = '🏛️';
      } else if (b.category === 'sports') {
        categoryColor = '#dc2626'; // red
        iconSymbol = '⚽';
      }

      const buildingIcon = L.divIcon({
        className: 'building-marker',
        html: `
          <div class="flex flex-col items-center cursor-pointer group">
            <div style="background-color: ${categoryColor};" class="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-xs shadow-lg border-2 ${
              isSelected ? 'border-amber-400 ring-4 ring-amber-300 scale-110' : 'border-white'
            } transition-all duration-200 group-hover:scale-110">
              ${iconSymbol}
            </div>
            <span class="text-[10px] font-black px-1.5 py-0.2 mt-1 rounded-md shadow-sm bg-white/95 text-slate-800 whitespace-nowrap border border-slate-200">
              ${b.code || (language === 'km' ? b.name_km.substring(0, 10) : b.name_en.substring(0, 10))}
            </span>
          </div>
        `,
        iconSize: [40, 50],
        iconAnchor: [20, 25],
      });

      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      const popupHtml = `
        <div class="p-3.5 text-slate-800 font-sans max-w-xs">
          <div class="flex items-center gap-1.5 mb-1.5">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            } flex items-center gap-1">
              ${isVerified ? '✓ ' + t.common.verified : '⚠ ' + t.common.unverified}
            </span>
            ${b.code ? `<span class="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">${b.code}</span>` : ''}
          </div>
          <h4 class="font-extrabold text-sm text-slate-900 leading-snug">${language === 'km' ? b.name_km : b.name_en}</h4>
          <p class="text-xs text-slate-500 mt-1 line-clamp-2">${(language === 'km' ? b.description_km : b.description_en) || ''}</p>
          <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-400 font-mono text-[10px]">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1">
              ${t.map.getDirections} ↗
            </a>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: buildingIcon }).bindPopup(popupHtml);

      // Bi-directional interaction: Clicking marker highlights facility card and scrolls into view
      marker.on('click', () => {
        setSelectedBuildingId(b.id);
        const cardElement = document.getElementById(`facility-card-${b.id}`);
        if (cardElement) {
          cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });

      markersLayerRef.current!.addLayer(marker);
      buildingMarkersMapRef.current.set(b.id, marker);

      if (selectedBuildingId === b.id) {
        marker.openPopup();
      }
    });

    // 3. Render Events Markers on Map
    events.forEach((ev) => {
      const lat = Number(ev.building_latitude);
      const lng = Number(ev.building_longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const eventIcon = L.divIcon({
        className: 'event-marker',
        html: `
          <div class="relative flex items-center justify-center animate-bounce cursor-pointer">
            <div class="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow-xl border-2 border-white ring-2 ring-rose-300">
              📅
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const eventPopup = `
        <div class="p-3.5 text-slate-800 font-sans max-w-xs">
          <span class="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
            Campus Event
          </span>
          <h4 class="font-bold text-sm text-slate-900 mt-1.5 leading-snug">${language === 'km' ? ev.title_km : ev.title_en}</h4>
          <p class="text-xs text-slate-500 mt-1">Date: ${new Date(ev.start_time).toLocaleDateString()}</p>
        </div>
      `;

      const eventMarker = L.marker([lat, lng], { icon: eventIcon }).bindPopup(eventPopup);
      eventMarker.on('click', () => {
        if (onSelectEvent) onSelectEvent(ev.id);
      });

      markersLayerRef.current!.addLayer(eventMarker);
    });
  }, [filteredBuildings, events, selectedCampusId, language, selectedBuildingId]);

  // Bi-directional interaction: Clicking facility card centers map and opens its popup
  const focusBuilding = (buildingId: number) => {
    setSelectedBuildingId(buildingId);
    const b = buildings.find((item) => item.id === buildingId);
    if (!b || !mapInstanceRef.current) return;

    const lat = Number(b.latitude);
    const lng = Number(b.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      mapInstanceRef.current.setView([lat, lng], 18, { animate: true });
      const marker = buildingMarkersMapRef.current.get(b.id);
      if (marker) {
        marker.openPopup();
      }
    }
  };

  // Custom Map Zoom Handlers
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => {
    if (mapInstanceRef.current && currentCampus) {
      mapInstanceRef.current.setView(
        [Number(currentCampus.latitude), Number(currentCampus.longitude)],
        17,
        { animate: true }
      );
      setSelectedBuildingId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[780px] relative">
      {/* Mobile Drawer Toggle Button */}
      <div className="md:hidden p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between z-20">
        <button
          onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs"
        >
          {isSidebarOpenMobile ? <PanelLeftClose className="w-4 h-4 text-brand-600" /> : <PanelLeftOpen className="w-4 h-4 text-brand-600" />}
          {isSidebarOpenMobile ? 'Hide Facilities' : 'Show Facilities List'}
        </button>
        <span className="text-xs font-semibold text-slate-600">
          {filteredBuildings.length} Facilities
        </span>
      </div>

      {/* Left Sidebar (35-40% desktop split-screen design) */}
      <div
        className={`${
          isSidebarOpenMobile ? 'flex' : 'hidden'
        } md:flex w-full md:w-[38%] lg:w-[35%] flex-col border-r border-slate-200 bg-slate-50/60 z-10 transition-all`}
      >
        {/* Campus & Search Controls Header */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-brand-600" />
              {t.map.selectCampus}
            </h3>
            <span className="text-[11px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {verifiedCount} {t.common.verified}
            </span>
          </div>

          {/* Campus Selector */}
          <select
            value={selectedCampusId}
            onChange={(e) => onSelectCampus(Number(e.target.value))}
            aria-label="Campus Selection"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          >
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {language === 'km' ? c.name_km : c.name_en}
              </option>
            ))}
          </select>

          {/* Search Box with Clear Button */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.map.searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Facility Category Filters with Counts */}
          <div className="flex flex-wrap gap-1 pt-1 max-h-24 overflow-y-auto">
            {[
              { id: 'all', label: t.map.allCategories },
              { id: 'academic', label: t.map.academic },
              { id: 'library', label: t.map.library },
              { id: 'cooperation_center', label: t.map.cooperationCenter },
              { id: 'lab', label: t.map.lab },
              { id: 'administrative', label: t.map.administrative },
              { id: 'canteen', label: t.map.canteen },
              { id: 'parking', label: t.map.parking },
            ]
              .filter((cat) => cat.id === 'all' || (categoryCounts[cat.id] || 0) > 0)
              .map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded-full ${selectedCategory === cat.id ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {categoryCounts[cat.id] || 0}
                  </span>
                </button>
              ))}
          </div>
        </div>

        {/* Scrollable Facility Cards List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredBuildings.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-600 font-bold">{t.map.noBuildingsFound}</p>
              <p className="text-[11px] text-slate-400 mt-1">Try adjusting the search query or category filter.</p>
            </div>
          ) : (
            filteredBuildings.map((b) => {
              const isVerified = b.verification_status === 'verified';
              const isSelected = selectedBuildingId === b.id;

              return (
                <div
                  key={b.id}
                  id={`facility-card-${b.id}`}
                  onClick={() => focusBuilding(b.id)}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-brand-50/80 border-brand-400 ring-2 ring-brand-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {b.code && (
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {b.code}
                        </span>
                      )}
                      <h4 className="font-extrabold text-xs text-slate-900 mt-1 leading-snug">
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

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-400 font-mono">
                      {Number(b.latitude).toFixed(4)}, {Number(b.longitude).toFixed(4)}
                    </span>
                    <span className="text-brand-600 font-bold hover:underline flex items-center gap-0.5">
                      {t.map.viewOnMap} →
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Interactive Map (60-65% desktop split-screen design) */}
      <div className="flex-1 relative flex flex-col h-full">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Custom Map Navigation Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 shadow-lg">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-sm shadow-xs transition-colors"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-sm shadow-xs transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-sm shadow-xs transition-colors"
            title={t.map.resetView}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating Map Legend Card */}
        <div className="absolute bottom-4 right-4 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200 text-[11px] space-y-1.5 pointer-events-auto">
          <div className="font-extrabold text-slate-900 text-xs mb-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-brand-600" /> RUPP Facilities
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-md bg-purple-600"></span> Cooperation Centers (CJCC, CKCC)
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-md bg-emerald-600"></span> Library (Hun Sen Library)
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-md bg-amber-600"></span> STEM & Computer Labs
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-md bg-teal-700"></span> Administration & Rectorate
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-md bg-slate-600"></span> Parking Zones
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-full bg-rose-600"></span> Published Campus Events
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampusMap;
