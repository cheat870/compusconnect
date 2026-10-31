import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import { useLanguage } from '../i18n/context.js';
import api from '../services/api.js';
import { fetchClientRoute, fetchClientReverseGeocode } from '../services/clientGeo.js';
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
  Layers,
  LocateFixed,
  Radio,
  Loader2,
  Info,
  Route,
  ChevronDown,
  Zap,
  ShieldCheck,
  TrendingUp,
  Clock,
  Minimize2,
  Maximize2,
  Eye,
  EyeOff,
  ChevronUp
} from 'lucide-react';

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  name?: string | null;
  type?: string;
  modifier?: string;
  trafficStatus?: 'smooth' | 'moderate' | 'congested';
}

export interface RouteOption {
  id: 'fastest_clear' | 'shortest' | 'bypass';
  name: string;
  nameEn: string;
  subtitle: string;
  subtitleEn: string;
  isRecommended: boolean;
  badge?: string;
  distance: number;
  duration: number;
  distanceSaved?: number;
  trafficLevel: 'smooth' | 'moderate' | 'congested';
  trafficLabel: string;
  trafficBadgeColor: 'emerald' | 'amber' | 'rose';
  delaySeconds: number;
  coordinates: [number, number][];
  steps?: RouteStep[];
}

export interface RouteData {
  destinationName: string;
  startName: string;
  distance: number;
  duration: number;
  mode: 'foot' | 'car';
  trafficLevel: 'smooth' | 'moderate' | 'congested';
  trafficLabel: string;
  trafficBadgeColor: 'emerald' | 'amber' | 'rose';
  activeRouteId: 'fastest_clear' | 'shortest' | 'bypass';
  routes: RouteOption[];
  coordinates: [number, number][];
  steps?: RouteStep[];
  isUsingUserLocation: boolean;
  destinationLat: number;
  destinationLng: number;
}

export interface AdministrativeLocation {
  village?: string | null;
  sangkat?: string | null;
  khan?: string | null;
  city?: string | null;
  road?: string | null;
  displayName?: string | null;
  formattedSummary?: string | null;
  loading?: boolean;
}

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

interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

interface LocationError {
  code?: number;
  message: string;
  type: 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'general';
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
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);
  const buildingMarkersMapRef = useRef<Map<number, L.Marker>>(new Map());
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(activeBuildingId || null);
  const [mobileTab, setMobileTab] = useState<'map' | 'facilities'>('map');

  // In-App Routing / Navigation States
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isRoutingLoading, setIsRoutingLoading] = useState<boolean>(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [selectedRouteMode, setSelectedRouteMode] = useState<'foot' | 'car'>('car');
  const [showTurnByTurn, setShowTurnByTurn] = useState<boolean>(false);
  const [isRoutePanelCollapsed, setIsRoutePanelCollapsed] = useState<boolean>(false);
  const activeDestinationRef = useRef<{ lat: number; lng: number; name: string } | null>(null);
  const startInAppRoutingRef = useRef<((destLat: number, destLng: number, destName: string, mode?: 'foot' | 'car') => Promise<void>) | null>(null);

  // Real-time Geolocation States
  const [userCoords, setUserCoords] = useState<UserLocation | null>(null);
  const userCoordsRef = useRef<UserLocation | null>(null);
  userCoordsRef.current = userCoords;
  const handleGetLocationRef = useRef<((silent?: boolean) => void) | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [locationError, setLocationError] = useState<LocationError | null>(null);
  const [isFollowingLocation, setIsFollowingLocation] = useState<boolean>(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState<boolean>(false);
  const [userAdminAddress, setUserAdminAddress] = useState<AdministrativeLocation | null>(null);
  const userAdminAddressRef = useRef<AdministrativeLocation | null>(null);
  userAdminAddressRef.current = userAdminAddress;
  const lastGeocodedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

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
        zoomControl: false, // Custom zoom controls in UI
      });

      // Configurable OpenStreetMap Tile Provider
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors | RUPP Pilot v2.0',
        maxZoom: 19,
      }).addTo(map);

      // Separate layers for campus facilities, user location, and route navigation
      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;

      const userGroup = L.layerGroup().addTo(map);
      userLocationLayerRef.current = userGroup;

      const routeGroup = L.layerGroup().addTo(map);
      routeLayerRef.current = routeGroup;

      mapInstanceRef.current = map;

      // Delegated click listener for in-popup "Get Directions" buttons
      const container = mapContainerRef.current;
      const handlePopupDirectionsClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('.btn-get-directions') as HTMLButtonElement;
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          const lat = parseFloat(btn.getAttribute('data-lat') || '0');
          const lng = parseFloat(btn.getAttribute('data-lng') || '0');
          const name = decodeURIComponent(btn.getAttribute('data-name') || '');
          if (lat && lng && startInAppRoutingRef.current) {
            startInAppRoutingRef.current(lat, lng, name);
          }
        }
      };
      container.addEventListener('click', handlePopupDirectionsClick);

      const handleResize = () => {
        map.invalidateSize();
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        container.removeEventListener('click', handlePopupDirectionsClick);
        if (watchIdRef.current !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      };
    }
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

  // Clean up watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

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
      let categoryColor = '#3b82f6';
      let iconSymbol = '🏢';
      if (b.category === 'library') {
        categoryColor = '#059669';
        iconSymbol = '📚';
      } else if (b.category === 'cooperation_center') {
        categoryColor = '#7c3aed';
        iconSymbol = '🤝';
      } else if (b.category === 'lab') {
        categoryColor = '#d97706';
        iconSymbol = '🔬';
      } else if (b.category === 'canteen') {
        categoryColor = '#ea580c';
        iconSymbol = '🍲';
      } else if (b.category === 'parking') {
        categoryColor = '#475569';
        iconSymbol = '🅿️';
      } else if (b.category === 'administrative') {
        categoryColor = '#0f766e';
        iconSymbol = '🏛️';
      } else if (b.category === 'sports') {
        categoryColor = '#dc2626';
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
          <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
            <span class="text-slate-400 font-mono text-[10px]">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
            <button
              type="button"
              class="btn-get-directions text-white bg-brand-600 hover:bg-brand-700 active:scale-95 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[11px] shadow-xs transition-all cursor-pointer"
              data-lat="${lat}"
              data-lng="${lng}"
              data-name="${encodeURIComponent(language === 'km' ? b.name_km : b.name_en)}"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              ${t.map.getDirections}
            </button>
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
          <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
            <span class="text-slate-400 font-mono text-[10px]">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
            <button
              type="button"
              class="btn-get-directions text-white bg-rose-600 hover:bg-rose-700 active:scale-95 font-bold px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] shadow-xs transition-all cursor-pointer"
              data-lat="${lat}"
              data-lng="${lng}"
              data-name="${encodeURIComponent(language === 'km' ? ev.title_km : ev.title_en)}"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              ${t.map.getDirections}
            </button>
          </div>
        </div>
      `;

      const eventMarker = L.marker([lat, lng], { icon: eventIcon }).bindPopup(eventPopup);
      eventMarker.on('click', () => {
        if (onSelectEvent) onSelectEvent(ev.id);
      });

      markersLayerRef.current!.addLayer(eventMarker);
    });
  }, [filteredBuildings, events, selectedCampusId, language, selectedBuildingId]);

  // Update User Location Marker and Accuracy Circle on Leaflet Map
  const updateUserLocationOnMap = useCallback((lat: number, lng: number, accuracy: number, shouldPan: boolean = false, adminLocation?: AdministrativeLocation | null) => {
    if (!mapInstanceRef.current || !userLocationLayerRef.current) return;

    const admin = adminLocation !== undefined ? adminLocation : userAdminAddressRef.current;
    const accuracyMeters = Math.round(accuracy);

    // Distinct blue dot marker with animated outer pulse and crisp white ring
    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></div>
          <div class="relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-xl ring-2 ring-blue-400"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const hasAdmin = admin && (admin.village || admin.sangkat || admin.khan || admin.city);

    const adminHtml = admin?.loading
      ? `
        <div class="my-2 p-2 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs text-blue-700 flex items-center gap-2">
          <span class="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0"></span>
          <span class="text-[11px] font-medium">${t.map.loadingAddress}</span>
        </div>
      `
      : hasAdmin
      ? `
        <div class="my-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 shadow-2xs">
          <div class="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <span>📍</span> ${t.map.administrativeArea}
          </div>
          <div class="space-y-1 text-slate-700 text-xs">
            ${admin.village ? `<div class="flex items-start gap-1.5"><span class="font-bold text-slate-900 shrink-0">${t.map.village}:</span> <span class="text-blue-900 font-bold">${admin.village}</span></div>` : ''}
            ${admin.sangkat ? `<div class="flex items-start gap-1.5"><span class="font-bold text-slate-900 shrink-0">${t.map.sangkat}:</span> <span class="text-indigo-900 font-bold">${admin.sangkat}</span></div>` : ''}
            ${admin.khan ? `<div class="flex items-start gap-1.5"><span class="font-bold text-slate-900 shrink-0">${t.map.khan}:</span> <span class="text-purple-900 font-bold">${admin.khan}</span></div>` : ''}
            ${admin.city ? `<div class="flex items-start gap-1.5"><span class="font-bold text-slate-900 shrink-0">${t.map.cityProvince}:</span> <span class="text-slate-800">${admin.city}</span></div>` : ''}
            ${admin.road ? `<div class="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 font-medium">${t.map.road}: ${admin.road}</div>` : ''}
          </div>
        </div>
      `
      : '';

    const popupContent = `
      <div class="p-3 text-slate-800 font-sans max-w-xs">
        <div class="flex items-center gap-1.5 mb-1">
          <span class="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
          <span class="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
            ${t.map.myLocation}
          </span>
        </div>
        <h4 class="font-bold text-sm text-slate-900">${t.map.locationFound}</h4>

        ${adminHtml}

        <div class="mt-2 space-y-0.5 text-xs text-slate-600 font-medium">
          <div>${t.map.locationAccuracy}: <span class="font-mono font-bold text-slate-800">±${accuracyMeters} ${t.map.meters}</span></div>
          <div class="font-mono text-[10px] text-slate-400 pt-0.5">GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
        </div>
        <p class="text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100 italic leading-snug">
          ${t.map.locationPrivacyNotice}
        </p>
      </div>
    `;

    if (userMarkerRef.current && userCircleRef.current) {
      // Update existing marker and accuracy circle seamlessly
      userMarkerRef.current.setLatLng([lat, lng]);
      userMarkerRef.current.setPopupContent(popupContent);
      userCircleRef.current.setLatLng([lat, lng]);
      userCircleRef.current.setRadius(accuracy);
    } else {
      // Create new circle and marker
      const circle = L.circle([lat, lng], {
        radius: accuracy,
        color: '#2563eb',
        weight: 1.5,
        opacity: 0.85,
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        dashArray: '4, 4',
      });

      const marker = L.marker([lat, lng], {
        icon: userIcon,
        zIndexOffset: 2000, // Ensure location sits on top of facility pins
      }).bindPopup(popupContent);

      userLocationLayerRef.current.clearLayers();
      userLocationLayerRef.current.addLayer(circle);
      userLocationLayerRef.current.addLayer(marker);

      userMarkerRef.current = marker;
      userCircleRef.current = circle;
    }

    if (shouldPan && mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom();
      const targetZoom = Math.max(currentZoom, 17);
      mapInstanceRef.current.setView([lat, lng], targetZoom, { animate: true });
    }
  }, [t.map, language]);

  // Handle Geolocation Errors Gracefully
  const handleLocationError = useCallback((err: GeolocationPositionError, silent: boolean = false) => {
    let type: 'denied' | 'unavailable' | 'timeout' | 'general' = 'general';
    let message = t.map.locationUnavailable;

    if (err.code === 1) { // PERMISSION_DENIED
      type = 'denied';
      message = t.map.locationPermissionDenied;
    } else if (err.code === 2) { // POSITION_UNAVAILABLE
      type = 'unavailable';
      message = t.map.locationUnavailable;
    } else if (err.code === 3) { // TIMEOUT
      type = 'timeout';
      message = t.map.locationTimeout;
    }

    setLocationStatus('error');
    if (!silent) {
      setLocationError({ code: err.code, message, type });
    }
  }, [t.map]);

  // Stop Watching Location Helper
  const stopWatchingLocation = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Fetch administrative address (Village/Phum, Sangkat, Khan, Capital/Province) via reverse geocoding
  const fetchAdministrativeAddress = useCallback(
    async (lat: number, lng: number, accuracy: number) => {
      setUserAdminAddress({ loading: true });
      updateUserLocationOnMap(lat, lng, accuracy, false, { loading: true });

      try {
        const res = await api.get(`/geo/reverse?lat=${lat}&lng=${lng}&lang=${language}`);
        if (res.data?.success && res.data?.data) {
          const adminData: AdministrativeLocation = res.data.data;
          setUserAdminAddress(adminData);
          lastGeocodedCoordsRef.current = { lat, lng };
          updateUserLocationOnMap(lat, lng, accuracy, false, adminData);
          return adminData;
        }
      } catch (err) {
        console.warn('Backend reverse geocoding unavailable, trying direct client lookup:', err);
      }

      // Direct client fallback via OpenStreetMap Nominatim
      try {
        const fallbackAdmin = await fetchClientReverseGeocode(lat, lng, language);
        if (fallbackAdmin) {
          const adminData: AdministrativeLocation = fallbackAdmin;
          setUserAdminAddress(adminData);
          lastGeocodedCoordsRef.current = { lat, lng };
          updateUserLocationOnMap(lat, lng, accuracy, false, adminData);
          return adminData;
        }
      } catch (clientErr) {
        console.warn('Direct reverse geocoding failed:', clientErr);
      }

      setUserAdminAddress(null);
      updateUserLocationOnMap(lat, lng, accuracy, false, null);
      return null;
    },
    [language, updateUserLocationOnMap]
  );

  // Request Current Location (One-time check, silent=true for background/auto-locate)
  const handleGetLocation = (silent: boolean = false) => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      if (!silent) {
        setLocationError({ type: 'unsupported', message: t.map.locationUnsupported });
      }
      return;
    }

    setLocationStatus('loading');
    if (!silent) {
      setLocationError(null);
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const newCoords: UserLocation = {
          lat: latitude,
          lng: longitude,
          accuracy,
          timestamp: pos.timestamp,
        };
        setUserCoords(newCoords);
        setLocationStatus('success');
        updateUserLocationOnMap(latitude, longitude, accuracy, true, { loading: true });
        fetchAdministrativeAddress(latitude, longitude, accuracy);

        // Open popup automatically on location capture
        if (userMarkerRef.current) {
          setTimeout(() => {
            userMarkerRef.current?.openPopup();
          }, 300);
        }
      },
      (err) => {
        handleLocationError(err, silent);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  handleGetLocationRef.current = handleGetLocation;

  // Auto-request location silently when CampusMap mounts/opens (silent mode: no error modal if denied)
  useEffect(() => {
    handleGetLocation(true);
  }, []);

  // Toggle "Follow My Location" Real-time Tracking (opt-in)
  const toggleFollowLocation = () => {
    if (isFollowingLocation) {
      stopWatchingLocation();
      setIsFollowingLocation(false);
    } else {
      if (!navigator.geolocation) {
        setLocationStatus('error');
        setLocationError({ type: 'unsupported', message: t.map.locationUnsupported });
        return;
      }

      setIsFollowingLocation(true);
      setLocationStatus('loading');
      setLocationError(null);

      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const newCoords: UserLocation = {
            lat: latitude,
            lng: longitude,
            accuracy,
            timestamp: pos.timestamp,
          };
          setUserCoords(newCoords);
          setLocationStatus('success');
          updateUserLocationOnMap(latitude, longitude, accuracy, true);

          // If moved > 25m or first time, re-fetch reverse geocode
          const last = lastGeocodedCoordsRef.current;
          if (!last || Math.hypot(last.lat - latitude, last.lng - longitude) > 0.00025) {
            fetchAdministrativeAddress(latitude, longitude, accuracy);
          }
        },
        (err) => {
          handleLocationError(err);
          stopWatchingLocation();
          setIsFollowingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        }
      );
      watchIdRef.current = id;
    }
  };

  const handleLocationButtonClick = () => {
    if (userCoords && mapInstanceRef.current && userMarkerRef.current) {
      mapInstanceRef.current.setView(
        [userCoords.lat, userCoords.lng],
        Math.max(mapInstanceRef.current.getZoom(), 17),
        { animate: true }
      );
      userMarkerRef.current.openPopup();
    } else {
      handleGetLocation();
    }
  };

  // Re-fetch administrative address when user changes language
  useEffect(() => {
    if (userCoords) {
      fetchAdministrativeAddress(userCoords.lat, userCoords.lng, userCoords.accuracy);
    }
  }, [language, fetchAdministrativeAddress]);

  // Focus building on map
  const focusBuilding = (buildingId: number) => {
    setSelectedBuildingId(buildingId);
    setMobileTab('map');
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 150);
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

  // -------------------------------------------------------------
  // In-App Routing / Navigation Engine (Leaflet Polyline on Web)
  // -------------------------------------------------------------
  const selectRouteOptionRef = useRef<((id: 'fastest_clear' | 'shortest' | 'bypass') => void) | null>(null);

  const renderRouteOnMap = useCallback((route: RouteData) => {
    if (!mapInstanceRef.current || !routeLayerRef.current) return;

    routeLayerRef.current.clearLayers();

    if (!route.coordinates || route.coordinates.length < 2) return;

    // 1. Draw Inactive / Alternative Routes First (Interactive click switches route)
    if (route.routes && route.routes.length > 1) {
      route.routes.forEach((alt) => {
        if (alt.id === route.activeRouteId || !alt.coordinates || alt.coordinates.length < 2) return;

        const altPoly = L.polyline(alt.coordinates, {
          color: '#64748b',
          weight: 5,
          opacity: 0.55,
          dashArray: '5, 8',
          lineCap: 'round',
          lineJoin: 'round',
        });

        altPoly.bindTooltip(
          `<div class="font-sans text-xs p-1">
             <div class="font-extrabold text-slate-900">${alt.name}</div>
             <div class="text-[10px] text-slate-500 font-mono mt-0.5">${alt.distance >= 1000 ? (alt.distance / 1000).toFixed(1) + ' km' : alt.distance + ' m'} • ${alt.trafficLabel}</div>
             <div class="text-[9px] text-blue-600 font-bold mt-1">👆 ចុចដើម្បីប្តូរមកផ្លូវនេះ (Click to switch)</div>
           </div>`,
          { sticky: true }
        );

        altPoly.on('click', () => {
          selectRouteOptionRef.current?.(alt.id);
        });

        altPoly.on('mouseover', () => {
          altPoly.setStyle({ color: '#0284c7', weight: 7, opacity: 0.9 });
        });
        altPoly.on('mouseout', () => {
          altPoly.setStyle({ color: '#64748b', weight: 5, opacity: 0.55 });
        });

        routeLayerRef.current!.addLayer(altPoly);
      });
    }

    // 2. Glowing casing polyline for Active Route
    const casing = L.polyline(route.coordinates, {
      color: '#1e3a8a',
      weight: 9,
      opacity: 0.38,
      lineCap: 'round',
      lineJoin: 'round',
    });

    // Active route path (vibrant blue or amber depending on traffic status)
    const line = L.polyline(route.coordinates, {
      color: route.trafficBadgeColor === 'emerald' ? '#2563eb' : '#f59e0b',
      weight: 6,
      opacity: 0.98,
      dashArray: route.mode === 'foot' ? '6, 8' : undefined,
      lineCap: 'round',
      lineJoin: 'round',
    });

    // Start marker (A)
    const startPt = route.coordinates[0];
    const startIcon = L.divIcon({
      className: 'route-start-icon',
      html: `
        <div class="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-emerald-300">
          A
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    const startMarker = L.marker(startPt, { icon: startIcon }).bindPopup(
      `<div class="font-bold text-xs p-1">📍 ${route.startName}</div>`
    );

    // Destination marker (B)
    const endPt = route.coordinates[route.coordinates.length - 1];
    const endIcon = L.divIcon({
      className: 'route-end-icon',
      html: `
        <div class="w-8 h-8 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-rose-300 animate-bounce">
          B
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    const endMarker = L.marker(endPt, { icon: endIcon }).bindPopup(
      `<div class="font-bold text-xs p-1">🏁 ${route.destinationName}</div>`
    );

    routeLayerRef.current.addLayer(casing);
    routeLayerRef.current.addLayer(line);
    routeLayerRef.current.addLayer(startMarker);
    routeLayerRef.current.addLayer(endMarker);

    // Auto-fit bounds so the entire path from user to destination is cleanly visible
    mapInstanceRef.current.fitBounds(line.getBounds(), {
      padding: [60, 60],
      maxZoom: 18,
      animate: true,
    });
  }, []);

  const selectRouteOption = useCallback(
    (optionId: 'fastest_clear' | 'shortest' | 'bypass') => {
      setRouteData((prev) => {
        if (!prev) return prev;
        const target = prev.routes?.find((r) => r.id === optionId);
        if (!target) return prev;

        const updated: RouteData = {
          ...prev,
          activeRouteId: target.id,
          distance: target.distance,
          duration: target.duration,
          trafficLevel: target.trafficLevel,
          trafficLabel: target.trafficLabel,
          trafficBadgeColor: target.trafficBadgeColor,
          coordinates: target.coordinates,
          steps: target.steps || prev.steps,
        };
        renderRouteOnMap(updated);
        return updated;
      });
    },
    [renderRouteOnMap]
  );

  selectRouteOptionRef.current = selectRouteOption;

  const clearRoute = useCallback(() => {
    setRouteData(null);
    setIsRoutePanelCollapsed(false);
    activeDestinationRef.current = null;
    setRoutingError(null);
    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
    }
  }, []);

  const startInAppRouting = useCallback(
    async (
      destLat: number,
      destLng: number,
      destName: string,
      mode: 'foot' | 'car' = selectedRouteMode
    ) => {
      activeDestinationRef.current = { lat: destLat, lng: destLng, name: destName };
      setIsRoutingLoading(true);
      setRoutingError(null);

      // Starting point: User's GPS position if available, else campus entrance
      const hasUserGps = Boolean(userCoords && userCoords.lat && userCoords.lng);
      let startLat = userCoords?.lat;
      let startLng = userCoords?.lng;
      let startName = language === 'km' ? 'ទីតាំងបច្ចុប្បន្នរបស់អ្នក' : 'Your Location';

      if (!startLat || !startLng) {
        startLat = currentCampus ? Number(currentCampus.latitude) : 11.56845;
        startLng = currentCampus ? Number(currentCampus.longitude) : 104.89115;
        startName = language === 'km' ? 'ច្រកចូលបរិវេណសាកលវិទ្យាល័យ' : 'Campus Main Entrance';
      }

      try {
        const res = await api.get(
          `/geo/directions?startLat=${startLat}&startLng=${startLng}&destLat=${destLat}&destLng=${destLng}&mode=${mode}&lang=${language}`
        );

        if (res.data?.success && res.data?.data) {
          const d = res.data.data;
          const smartRoutes: RouteOption[] = d.routes || [];
          const activeId = 'fastest_clear';
          const activeOption = smartRoutes.find((r) => r.id === activeId) || smartRoutes[0];

          const newRoute: RouteData = {
            destinationName: destName,
            startName,
            distance: activeOption ? activeOption.distance : d.distance,
            duration: activeOption ? activeOption.duration : d.duration,
            mode,
            trafficLevel: activeOption ? activeOption.trafficLevel : (d.trafficLevel || 'smooth'),
            trafficLabel: activeOption ? activeOption.trafficLabel : (d.trafficLabel || (language === 'km' ? 'រលូនល្អ • គ្មានការកកស្ទះ' : 'Free Flowing • No Congestion')),
            trafficBadgeColor: activeOption ? activeOption.trafficBadgeColor : (d.trafficBadgeColor || 'emerald'),
            activeRouteId: activeId,
            routes: smartRoutes,
            coordinates: activeOption ? activeOption.coordinates : d.coordinates,
            steps: activeOption ? activeOption.steps : d.steps,
            isUsingUserLocation: hasUserGps,
            destinationLat: destLat,
            destinationLng: destLng,
          };
          setRouteData(newRoute);
          setIsRoutePanelCollapsed(false);
          setMobileTab('map');
          setTimeout(() => {
            mapInstanceRef.current?.invalidateSize();
          }, 150);
          renderRouteOnMap(newRoute);
          return;
        }
      } catch (err: any) {
        console.warn('Backend routing unavailable, using direct client OSRM router:', err.message);
      }

      // Client-side direct OSRM routing fallback (no network error)
      try {
        const d = await fetchClientRoute(startLat, startLng, destLat, destLng, mode, language);
        const smartRoutes: RouteOption[] = d.routes || [];
        const activeId = 'fastest_clear';
        const activeOption = smartRoutes.find((r) => r.id === activeId) || smartRoutes[0];

        const newRoute: RouteData = {
          destinationName: destName,
          startName,
          distance: activeOption ? activeOption.distance : d.distance,
          duration: activeOption ? activeOption.duration : d.duration,
          mode,
          trafficLevel: activeOption ? activeOption.trafficLevel : 'smooth',
          trafficLabel: activeOption ? activeOption.trafficLabel : (language === 'km' ? 'រលូនល្អ • គ្មានការកកស្ទះ' : 'Free Flowing • No Congestion'),
          trafficBadgeColor: activeOption ? activeOption.trafficBadgeColor : 'emerald',
          activeRouteId: activeId,
          routes: smartRoutes,
          coordinates: activeOption ? activeOption.coordinates : d.coordinates,
          steps: activeOption ? activeOption.steps : d.steps,
          isUsingUserLocation: hasUserGps,
          destinationLat: destLat,
          destinationLng: destLng,
        };
        setRouteData(newRoute);
        setIsRoutePanelCollapsed(false);
        setMobileTab('map');
        setTimeout(() => {
          mapInstanceRef.current?.invalidateSize();
        }, 150);
        renderRouteOnMap(newRoute);
      } catch (clientErr: any) {
        console.error('Client routing error:', clientErr);
        setRoutingError(language === 'km' ? 'មិនអាចគណនាទិសដៅផ្លូវបានទេ' : 'Unable to calculate route');
      } finally {
        setIsRoutingLoading(false);
      }
    },
    [userCoords, currentCampus, language, selectedRouteMode, renderRouteOnMap]
  );

  // Keep ref up to date for delegated Leaflet popup clicks
  startInAppRoutingRef.current = startInAppRouting;

  const handleUseMyLocationForRouting = () => {
    if (navigator.geolocation) {
      setIsRoutingLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const coords = { lat: latitude, lng: longitude, accuracy, timestamp: pos.timestamp };
          setUserCoords(coords);
          updateUserLocationOnMap(latitude, longitude, accuracy, false);
          if (activeDestinationRef.current) {
            startInAppRouting(
              activeDestinationRef.current.lat,
              activeDestinationRef.current.lng,
              activeDestinationRef.current.name,
              selectedRouteMode
            );
          }
        },
        (err) => {
          setIsRoutingLoading(false);
          handleLocationError(err);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[580px] sm:h-[660px] lg:h-[740px] max-h-[85vh] relative w-full max-w-full">
      {/* Mobile Mode Segmented Switcher (Visible on Mobile) */}
      <div className="md:hidden p-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 z-20 shrink-0">
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs flex-1">
          <button
            type="button"
            onClick={() => {
              setMobileTab('map');
              setTimeout(() => {
                mapInstanceRef.current?.invalidateSize();
              }, 150);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'map'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{language === 'km' ? 'ផែនទី' : 'Map'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('facilities')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'facilities'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>{language === 'km' ? 'បញ្ជីអគារ' : 'Facilities'} ({filteredBuildings.length})</span>
          </button>
        </div>
      </div>

      {/* Left Sidebar (Facilities list: 100% on mobile when selected, 360px-420px on desktop) */}
      <div
        className={`${
          mobileTab === 'facilities' ? 'flex' : 'hidden'
        } md:flex w-full md:w-[360px] lg:w-[400px] xl:w-[420px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/60 z-10 transition-all h-full overflow-hidden`}
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

          {/* User Current Administrative Location Badge (Village, Sangkat, Khan) */}
          {userCoords && (
            <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 border border-blue-200/80 rounded-xl p-2.5 text-xs text-slate-800 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>{t.map.administrativeArea}</span>
                </div>
                <span className="font-mono text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-full border border-blue-200">
                  ±{Math.round(userCoords.accuracy)}m
                </span>
              </div>
              {userAdminAddress?.loading ? (
                <div className="flex items-center gap-1.5 text-[11px] text-blue-600 animate-pulse pl-5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{t.map.loadingAddress}</span>
                </div>
              ) : userAdminAddress?.sangkat || userAdminAddress?.khan ? (
                <div className="text-[11px] text-slate-700 pl-5 space-y-0.5 leading-snug">
                  {userAdminAddress.village && (
                    <div>
                      <span className="font-bold text-slate-900">{t.map.village}:</span>{' '}
                      <span className="text-blue-900 font-bold">{userAdminAddress.village}</span>
                    </div>
                  )}
                  {userAdminAddress.sangkat && (
                    <div>
                      <span className="font-bold text-slate-900">{t.map.sangkat}:</span>{' '}
                      <span className="text-indigo-900 font-bold">{userAdminAddress.sangkat}</span>
                    </div>
                  )}
                  {userAdminAddress.khan && (
                    <div>
                      <span className="font-bold text-slate-900">{t.map.khan}:</span>{' '}
                      <span className="text-purple-900 font-bold">{userAdminAddress.khan}</span>
                    </div>
                  )}
                  {userAdminAddress.city && (
                    <div className="text-[10px] text-slate-500 pt-0.5">
                      {userAdminAddress.city} {userAdminAddress.road ? `(${userAdminAddress.road})` : ''}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 pl-5 font-mono">
                  GPS: {userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)}
                </div>
              )}
            </div>
          )}

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
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startInAppRouting(
                            Number(b.latitude),
                            Number(b.longitude),
                            language === 'km' ? b.name_km : b.name_en
                          );
                        }}
                        className="text-brand-700 hover:text-white bg-brand-50 hover:bg-brand-600 border border-brand-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title={t.map.getDirections}
                      >
                        <Navigation className="w-3 h-3" />
                        {t.map.getDirections}
                      </button>
                      <span className="text-slate-400 font-bold hover:underline flex items-center gap-0.5">
                        {t.map.viewOnMap} →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Interactive Map (Desktop split or Mobile Map Tab) */}
      <div
        className={`${
          mobileTab === 'map' ? 'flex' : 'hidden'
        } md:flex flex-1 relative flex-col h-full min-w-0 overflow-hidden`}
      >
        <div ref={mapContainerRef} className="w-full h-full z-0 min-h-0" />

        {/* Location Error Alert Banner (Compact & Non-intrusive) */}
        {locationError && (
          <div
            data-testid="location-error-alert"
            className="absolute top-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm z-30 bg-white/95 backdrop-blur-md border border-rose-200 rounded-2xl shadow-xl p-3 text-xs text-slate-800 space-y-2 animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-rose-900 text-xs">
                    {locationError.type === 'denied'
                      ? (language === 'km' ? 'ការអនុញ្ញាតទីតាំងត្រូវបានបដិសេធ' : 'Location Permission Denied')
                      : locationError.type === 'timeout'
                      ? (language === 'km' ? 'ផុតកំណត់ពេលស្នើសុំទីតាំង' : 'Location Request Timed Out')
                      : (language === 'km' ? 'មិនអាចកំណត់ទីតាំងបានទេ' : 'Location Unavailable')}
                  </h5>
                  <p className="text-slate-600 mt-0.5 leading-snug text-[11px]">
                    {language === 'km' 
                      ? 'សូមបើក Location ក្នុង Settings ឬចុចប៊ូតុងខាងក្រោមដើម្បីសាកល្បង' 
                      : 'Please enable Location in Phone Settings or tap below to retry.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLocationError(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title={t.common.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                onClick={() => setLocationError(null)}
                className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-lg transition-colors"
              >
                {t.common.close}
              </button>
              <button
                onClick={() => handleGetLocation(false)}
                className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
              >
                {language === 'km' ? 'ព្យាយាមម្តងទៀត' : 'Try Again'}
              </button>
            </div>
          </div>
        )}

        {/* In-App Routing Loading Badge */}
        {isRoutingLoading && (
          <div className="absolute top-4 left-4 z-30 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-blue-200 p-3.5 flex items-center gap-2.5 text-xs font-bold text-slate-800 animate-pulse pointer-events-auto">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span>{t.map.calculatingRoute}</span>
          </div>
        )}

        {/* In-App Routing Error Alert */}
        {routingError && (
          <div className="absolute top-4 left-4 z-30 max-w-sm bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-rose-200 p-3 text-xs text-rose-800 flex items-center justify-between gap-2 pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{routingError}</span>
            </div>
            <button
              onClick={() => setRoutingError(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Floating In-App Navigation / Directions Panel */}
        {routeData && (
          isRoutePanelCollapsed ? (
            /* Collapsed / Minimized Pill */
            <div className="absolute top-4 left-4 z-30 max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-blue-200 p-2 sm:p-2.5 flex items-center justify-between gap-3 pointer-events-auto transition-all animate-in fade-in slide-in-from-top-2">
              <button
                type="button"
                onClick={() => setIsRoutePanelCollapsed(false)}
                className="flex items-center gap-2.5 text-left flex-1 min-w-0 group cursor-pointer"
                title={t.map.expandRoute}
              >
                <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Route className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-xs text-slate-900 truncate max-w-[140px] sm:max-w-[200px]">
                      {routeData.destinationName}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md shrink-0">
                      {routeData.trafficBadgeColor === 'emerald' ? '🟢 ' : '🟡 '}
                      {routeData.distance >= 1000 ? `${(routeData.distance / 1000).toFixed(1)} km` : `${routeData.distance} m`}
                      {' • '}
                      {Math.ceil(routeData.duration / 60)} {language === 'km' ? 'នាទី' : 'min'}
                    </span>
                  </div>
                  <p className="text-[10px] text-blue-600 font-semibold group-hover:underline flex items-center gap-1 mt-0.5">
                    <Maximize2 className="w-3 h-3 inline" />
                    <span>{t.map.expandRoute}</span>
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-1 border-l border-slate-200 pl-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRoutePanelCollapsed(false)}
                  className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title={t.map.expandRoute}
                  aria-label={t.map.expandRoute}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.map.showPanel}</span>
                </button>
                <button
                  type="button"
                  onClick={clearRoute}
                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title={t.map.clearRoute}
                  aria-label={t.map.clearRoute}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Full Expanded Navigation Card */
            <div className="absolute top-4 left-4 z-30 max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-blue-200 overflow-hidden pointer-events-auto transition-all animate-in fade-in slide-in-from-top-2">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <Route className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-xs tracking-tight truncate">
                      {t.map.navigation}
                    </h4>
                    <p className="text-[10px] text-blue-100 font-medium truncate">
                      {routeData.isUsingUserLocation ? t.map.usingMyLocation : t.map.usingCampusEntrance}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Minimize / Hide Button */}
                  <button
                    type="button"
                    onClick={() => setIsRoutePanelCollapsed(true)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer"
                    title={t.map.minimizeRoute}
                    aria-label={t.map.minimizeRoute}
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                  {/* Clear Route Button */}
                  <button
                    type="button"
                    onClick={clearRoute}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-rose-500/80 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer"
                    title={t.map.clearRoute}
                    aria-label={t.map.clearRoute}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

            {/* Origin & Destination summary */}
            <div className="p-3.5 space-y-3 text-xs">
              <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-200" />
                  <span className="font-semibold text-[11px] truncate">{routeData.startName}</span>
                </div>
                <div className="ml-1 w-0.5 h-2 bg-slate-200" />
                <div className="flex items-center gap-2 text-slate-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 ring-2 ring-rose-200" />
                  <span className="font-bold text-[11px] truncate">{routeData.destinationName}</span>
                </div>
              </div>

              {/* Smart Multi-Route Selection (Fastest & Avoid Traffic vs Shortest) */}
              {routeData.routes && routeData.routes.length > 1 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span className="flex items-center gap-1 text-slate-800">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      {t.map.routeOptions}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                      {routeData.trafficLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {routeData.routes.map((opt) => {
                      const isSelected = opt.id === routeData.activeRouteId;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => selectRouteOption(opt.id)}
                          className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-300 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-[10.5px] font-black truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                                {opt.id === 'fastest_clear' && '⚡ '}
                                {opt.id === 'shortest' && '📏 '}
                                {opt.id === 'bypass' && '🛡️ '}
                                {opt.name}
                              </span>
                              {opt.badge && (
                                <span className={`text-[9px] px-1 py-0.2 rounded font-black shrink-0 ${
                                  opt.isRecommended ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {opt.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{opt.subtitle}</p>
                          </div>

                          <div className="mt-2 pt-1.5 border-t border-slate-100/80 flex items-center justify-between text-[10px] font-mono">
                            <span className={`font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                              {opt.distance >= 1000 ? `${(opt.distance / 1000).toFixed(1)}km` : `${opt.distance}m`}
                            </span>
                            <span className="text-slate-500">
                              {Math.ceil(opt.duration / 60)} {language === 'km' ? 'នាទី' : 'min'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Traffic Avoidance & Condition Notice */}
              <div
                className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-2 ${
                  routeData.trafficBadgeColor === 'emerald'
                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/90 border-amber-200 text-amber-900'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {routeData.trafficBadgeColor === 'emerald' ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div className="flex-1 leading-snug">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>{t.map.trafficStatus}:</span>
                    <span className="underline decoration-dotted">{routeData.trafficLabel}</span>
                  </div>
                  <p className="text-[10px] opacity-90 mt-0.5">
                    {routeData.activeRouteId === 'fastest_clear' || routeData.trafficBadgeColor === 'emerald'
                      ? t.map.trafficBypassNotice
                      : language === 'km'
                      ? 'ផ្លូវកាត់ខ្លីនេះជួយកាត់បន្ថយចម្ងាយធ្វើដំណើរ ប៉ុន្តែអាចមានការយឺតយ៉ាវនៅចំណុចប្រសព្វធំៗ។'
                      : 'This direct path minimizes physical distance, but may experience intersection delays.'}
                  </p>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-blue-50/80 border border-blue-100 p-2 rounded-xl">
                  <div className="text-[10px] text-blue-700 font-semibold">{t.map.distance}</div>
                  <div className="text-sm font-black text-blue-950 mt-0.5">
                    {routeData.distance >= 1000
                      ? `${(routeData.distance / 1000).toFixed(1)} km`
                      : `${routeData.distance} m`}
                  </div>
                </div>
                <div className="bg-indigo-50/80 border border-indigo-100 p-2 rounded-xl">
                  <div className="text-[10px] text-indigo-700 font-semibold">{t.map.estimatedTime}</div>
                  <div className="text-sm font-black text-indigo-950 mt-0.5">
                    {Math.ceil(routeData.duration / 60)} {language === 'km' ? 'នាទី' : 'min'}
                  </div>
                </div>
              </div>

              {/* If using campus entrance, prompt to use GPS */}
              {!routeData.isUsingUserLocation && (
                <button
                  type="button"
                  onClick={handleUseMyLocationForRouting}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LocateFixed className="w-3.5 h-3.5 text-amber-600" />
                  {t.map.useMyLocationInstead}
                </button>
              )}

              {/* Turn-by-Turn Steps Accordion */}
              {routeData.steps && routeData.steps.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowTurnByTurn(!showTurnByTurn)}
                    className="w-full flex items-center justify-between text-[11px] font-bold text-slate-700 hover:text-blue-700 py-1 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Navigation className="w-3 h-3 text-blue-600" />
                      {t.map.turnByTurn} ({routeData.steps.length})
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTurnByTurn ? 'rotate-180' : ''}`} />
                  </button>

                  {showTurnByTurn && (
                    <div className="mt-2 max-h-44 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                      {routeData.steps.map((st, idx) => (
                        <div key={idx} className="pt-1.5 first:pt-0 flex items-start gap-2 text-[11px]">
                          <span
                            className={`w-4 h-4 rounded-full font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5 ${
                              st.trafficStatus === 'moderate'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-slate-800 leading-snug">{st.instruction}</p>
                              {st.trafficStatus === 'moderate' && (
                                <span className="text-[9px] font-bold px-1 rounded bg-amber-100 text-amber-800 shrink-0">
                                  {language === 'km' ? 'ចរាចរណ៍មធ្យម' : 'Busy'}
                                </span>
                              )}
                            </div>
                            {st.distance > 0 && (
                              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                {st.distance} m ({Math.ceil(st.duration / 60)} min)
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${routeData.destinationLat},${routeData.destinationLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-brand-600 font-semibold flex items-center gap-1"
                >
                  {t.map.openInGoogleMaps} <ExternalLink className="w-3 h-3" />
                </a>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsRoutePanelCollapsed(true)}
                    className="text-slate-500 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    title={t.map.minimizeRoute}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>{t.map.hidePanel}</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearRoute}
                    className="text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
                  >
                    {t.map.clearRoute}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      )}

        {/* Custom Map Navigation Controls Stack (Zoom & Quick Location) */}
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

          <div className="w-full h-px bg-slate-200 my-0.5" />

          {/* Quick Location Button in Zoom Stack */}
          <button
            onClick={() => handleGetLocation(false)}
            disabled={locationStatus === 'loading'}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm shadow-xs transition-colors ${
              userCoords
                ? 'bg-blue-600 border-blue-700 text-white hover:bg-blue-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title="My Location (ទីតាំងរបស់ខ្ញុំ)"
          >
            {locationStatus === 'loading' ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <LocateFixed className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Floating Map Legend Card */}
        <div className="absolute bottom-4 right-4 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200 text-[11px] space-y-1.5 pointer-events-auto">
          <div className="font-extrabold text-slate-900 text-xs mb-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-brand-600" />
            <span className="truncate max-w-[200px]">
              {language === 'km' ? 'ទីតាំងអគារ និងការរុករក' : 'Campus Facilities & Navigation'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-md bg-purple-600"></span> {t.map.cooperationCenter}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-md bg-emerald-600"></span> {t.map.library}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-md bg-amber-600"></span> {t.map.lab}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-md bg-teal-700"></span> {language === 'km' ? 'រដ្ឋបាល' : 'Administration'}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-md bg-slate-600"></span> {language === 'km' ? 'ចំណតយានយន្ត' : 'Parking Zones'}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded-full bg-rose-600"></span> {language === 'km' ? 'ព្រឹត្តិការណ៍បរិវេណ' : 'Campus Events'}
          </div>
          {userCoords && (
            <div className="flex items-center gap-2 text-blue-700 font-bold pt-1 border-t border-slate-100">
              <span className="w-3 h-3 rounded-full bg-blue-600 ring-2 ring-blue-300"></span> {t.map.myLocation} (±{Math.round(userCoords.accuracy)}m)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampusMap;
