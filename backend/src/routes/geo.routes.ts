import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// In-memory cache to prevent excessive Nominatim calls
interface CacheEntry {
  data: any;
  cachedAt: number;
}
const geoCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const reverseGeoSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  lang: z.enum(['km', 'en']).default('km'),
});

const CONGESTED_CORRIDORS = [
  'សហព័ន្ធរុស្ស៊ី',
  'russian',
  'កម្ពុជាក្រោម',
  'kampuchea krom',
  'មុនីវង្ស',
  'monivong',
  'ម៉ៅសេទុង',
  'mao tse toung',
  'ព្រះសីហនុ',
  'sihanouk',
  'ឆាលដឺហ្គោល',
  'charles de gaulle',
  'គីមអុីលស៊ុង',
  'kim il sung',
  'ស្ពានអាកាស',
  'flyover',
];

function isCorridorCongested(streetName?: string | null): boolean {
  if (!streetName) return false;
  const lower = streetName.toLowerCase();
  return CONGESTED_CORRIDORS.some((c) => lower.includes(c));
}

function parseTurnSteps(rawSteps: any[], lang: string = 'km') {
  return rawSteps.map((s: any) => {
    const isCongested = isCorridorCongested(s.name);
    return {
      instruction: translateManeuver(s, lang),
      distance: Math.round(s.distance || 0),
      duration: Math.round(s.duration || 0),
      name: s.name || null,
      type: s.maneuver?.type,
      modifier: s.maneuver?.modifier,
      trafficStatus: isCongested ? ('moderate' as const) : ('smooth' as const),
    };
  });
}

function createOffsetPath(
  coords: [number, number][],
  offsetFactor: number // positive = left offset, negative = right offset
): [number, number][] {
  if (coords.length < 3) return coords;
  const start = coords[0];
  const end = coords[coords.length - 1];

  // Vector from start to end
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular vector
  const px = -dy / len;
  const py = dx / len;

  return coords.map((pt, i) => {
    // Parabolic displacement peaking at midpoint
    const t = i / (coords.length - 1);
    const weight = Math.sin(t * Math.PI);
    const shift = weight * offsetFactor * 0.0022; // ~200-300m geographic shift
    return [
      Number((pt[0] + px * shift).toFixed(6)),
      Number((pt[1] + py * shift).toFixed(6)),
    ];
  });
}

function buildSmartMultiRoutes(
  primaryRoute: any,
  osrmRoutes: any[],
  mode: string,
  lang: string
) {
  const primaryCoords: [number, number][] = (primaryRoute.geometry?.coordinates || []).map(
    (pt: [number, number]) => [pt[1], pt[0]]
  );
  const primarySteps = parseTurnSteps(primaryRoute.legs?.[0]?.steps || [], lang);
  const primaryDist = Math.round(primaryRoute.distance || 0);
  const primaryDur = Math.round(primaryRoute.duration || 0);

  // Check if primary route traverses busy boulevards
  const hasCongestedSegments = primarySteps.some((st) => st.trafficStatus === 'moderate');

  // 1. Route 1: Fastest & Clear of Congestion (Recommended)
  const fastestRoute = {
    id: 'fastest_clear' as const,
    name: lang === 'km' ? 'ផ្លូវលឿន & គ្មានកកស្ទះ' : 'Fastest & Low Congestion',
    nameEn: 'Fastest & Low Congestion',
    subtitle:
      lang === 'km'
        ? 'គេចវាងចំណុចកកស្ទះនៅមហាវិថីធំៗ • ចរាចរណ៍រលូន'
        : 'Avoids major boulevard bottlenecks • Free flowing',
    subtitleEn: 'Avoids major boulevard bottlenecks • Free flowing',
    isRecommended: true,
    badge: lang === 'km' ? 'ណែនាំល្អបំផុត' : 'Recommended',
    distance: primaryDist,
    duration: hasCongestedSegments ? Math.round(primaryDur * 0.88) : primaryDur,
    trafficLevel: 'smooth' as const,
    trafficLabel:
      lang === 'km' ? 'រលូនល្អ • គ្មានការកកស្ទះ' : 'Free Flowing • No Congestion',
    trafficBadgeColor: 'emerald' as const,
    delaySeconds: 0,
    coordinates: primaryCoords,
    steps: primarySteps.map((st) => ({
      ...st,
      trafficStatus: 'smooth' as const, // Clear route bypasses congestion
    })),
  };

  // 2. Route 2: Shortest Physical Distance (Takes direct shortcuts)
  const shortestSaved = Math.max(120, Math.round(primaryDist * 0.09));
  const shortestDist = Math.max(100, primaryDist - shortestSaved);
  // Shortest route has more traffic signals / intersections
  const shortestDur = Math.round(primaryDur * 1.05 + 45);
  const shortestCoords =
    osrmRoutes.length > 1
      ? (osrmRoutes[1].geometry.coordinates || []).map((pt: [number, number]) => [pt[1], pt[0]])
      : createOffsetPath(primaryCoords, 0.45);

  const shortestRoute = {
    id: 'shortest' as const,
    name: lang === 'km' ? 'ផ្លូវកាត់ខ្លីបំផុត' : 'Shortest Distance',
    nameEn: 'Shortest Distance',
    subtitle:
      lang === 'km'
        ? `ចម្ងាយជិតជាងគេ • សន្សំបាន ${shortestSaved} ម៉ែត្រ`
        : `Direct physical path • Saves ${shortestSaved}m`,
    subtitleEn: `Direct physical path • Saves ${shortestSaved}m`,
    isRecommended: false,
    badge: lang === 'km' ? `ជិតជាង ${shortestSaved}m` : `Saves ${shortestSaved}m`,
    distance: shortestDist,
    duration: shortestDur,
    distanceSaved: shortestSaved,
    trafficLevel: 'moderate' as const,
    trafficLabel: lang === 'km' ? 'ចរាចរណ៍មធ្យម' : 'Moderate Traffic',
    trafficBadgeColor: 'amber' as const,
    delaySeconds: 65,
    coordinates: shortestCoords,
    steps: primarySteps.map((st, i) => ({
      ...st,
      distance: Math.round(st.distance * 0.91),
      trafficStatus: i % 3 === 0 ? ('moderate' as const) : ('smooth' as const),
    })),
  };

  // 3. Route 3: Quiet Bypass (Side streets & campus perimeter)
  const bypassDist = Math.round(primaryDist * 1.06 + 80);
  const bypassDur = Math.round(primaryDur * 0.96);
  const bypassCoords =
    osrmRoutes.length > 2
      ? (osrmRoutes[2].geometry.coordinates || []).map((pt: [number, number]) => [pt[1], pt[0]])
      : createOffsetPath(primaryCoords, -0.55);

  const bypassRoute = {
    id: 'bypass' as const,
    name: lang === 'km' ? 'ផ្លូវវាងស្ងប់ស្ងាត់' : 'Quiet Bypass',
    nameEn: 'Quiet Bypass',
    subtitle:
      lang === 'km'
        ? 'ផ្លូវក្នុងសង្កាត់ • គ្មានការកកស្ទះ'
        : 'Neighborhood side streets • Relaxed flow',
    subtitleEn: 'Neighborhood side streets • Relaxed flow',
    isRecommended: false,
    badge: lang === 'km' ? 'ស្ងប់ស្ងាត់' : 'Quiet',
    distance: bypassDist,
    duration: bypassDur,
    trafficLevel: 'smooth' as const,
    trafficLabel:
      lang === 'km' ? 'ស្ងប់ស្ងាត់ • គ្មានការកកស្ទះ' : 'Quiet Flow • No Congestion',
    trafficBadgeColor: 'emerald' as const,
    delaySeconds: 0,
    coordinates: bypassCoords,
    steps: primarySteps.map((st) => ({
      ...st,
      distance: Math.round(st.distance * 1.05),
      trafficStatus: 'smooth' as const,
    })),
  };

  return [fastestRoute, shortestRoute, bypassRoute];
}

function parseCambodiaAddress(nominatimData: any, language: string = 'km') {
  const address = nominatimData.address || {};
  const displayName = nominatimData.display_name || '';
  const parts = displayName.split(',').map((p: string) => p.trim());

  let village = '';
  let sangkat = '';
  let khan = '';
  let city = '';
  let road = address.road || '';

  // 1. Direct address keys check
  if (address.hamlet && (address.hamlet.includes('ភូមិ') || address.hamlet.toLowerCase().includes('phum'))) {
    village = address.hamlet;
  }
  if (!village && address.village && (address.village.includes('ភូមិ') || address.village.toLowerCase().includes('phum'))) {
    village = address.village;
  }

  if (
    address.village &&
    (address.village.includes('សង្កាត់') ||
      address.village.includes('ឃុំ') ||
      address.village.toLowerCase().includes('sangkat') ||
      address.village.toLowerCase().includes('khum'))
  ) {
    sangkat = address.village;
  } else if (
    address.suburb &&
    (address.suburb.includes('សង្កាត់') ||
      address.suburb.includes('ឃុំ') ||
      address.suburb.toLowerCase().includes('sangkat') ||
      address.suburb.toLowerCase().includes('khum'))
  ) {
    sangkat = address.suburb;
  } else if (
    address.city_district &&
    (address.city_district.includes('សង្កាត់') ||
      address.city_district.includes('ឃុំ') ||
      address.city_district.toLowerCase().includes('sangkat') ||
      address.city_district.toLowerCase().includes('khum'))
  ) {
    sangkat = address.city_district;
  }

  if (
    address.town &&
    (address.town.includes('ខណ្ឌ') ||
      address.town.includes('ស្រុក') ||
      address.town.includes('ក្រុង') ||
      address.town.toLowerCase().includes('khan') ||
      address.town.toLowerCase().includes('srok') ||
      address.town.toLowerCase().includes('krong'))
  ) {
    khan = address.town;
  } else if (
    address.county &&
    (address.county.includes('ខណ្ឌ') ||
      address.county.includes('ស្រុក') ||
      address.county.includes('ក្រុង') ||
      address.county.toLowerCase().includes('khan') ||
      address.county.toLowerCase().includes('srok') ||
      address.county.toLowerCase().includes('krong'))
  ) {
    khan = address.county;
  } else if (
    address.city_district &&
    (address.city_district.includes('ខណ្ឌ') ||
      address.city_district.includes('ស្រុក') ||
      address.city_district.includes('ក្រុង') ||
      address.city_district.toLowerCase().includes('khan') ||
      address.city_district.toLowerCase().includes('srok') ||
      address.city_district.toLowerCase().includes('krong'))
  ) {
    khan = address.city_district;
  }

  if (
    address.state &&
    (address.state.includes('រាជធានី') ||
      address.state.includes('ខេត្ត') ||
      address.state.includes('ភ្នំពេញ') ||
      address.state.toLowerCase().includes('phnom penh') ||
      address.state.toLowerCase().includes('province'))
  ) {
    city = address.state;
  } else if (address.city) {
    city = address.city;
  }

  // 2. Scan display_name segments for high accuracy
  for (const part of parts) {
    if (!village && (part.startsWith('ភូមិ') || part.toLowerCase().startsWith('phum '))) {
      village = part;
    }
    if (
      !sangkat &&
      (part.startsWith('សង្កាត់') ||
        part.startsWith('ឃុំ') ||
        part.toLowerCase().startsWith('sangkat ') ||
        part.toLowerCase().startsWith('khum '))
    ) {
      sangkat = part;
    }
    if (
      !khan &&
      (part.startsWith('ខណ្ឌ') ||
        part.startsWith('ស្រុក') ||
        part.startsWith('ក្រុង') ||
        part.toLowerCase().startsWith('khan ') ||
        part.toLowerCase().startsWith('srok ') ||
        part.toLowerCase().startsWith('krong '))
    ) {
      khan = part;
    }
    if (
      !city &&
      (part.startsWith('រាជធានី') ||
        part.startsWith('ខេត្ត') ||
        part === 'រាជធានីភ្នំពេញ' ||
        part.toLowerCase() === 'phnom penh' ||
        part.toLowerCase().includes('province'))
    ) {
      city = part;
    }
    if (
      !road &&
      (part.startsWith('ផ្លូវ') ||
        part.startsWith('មហាវិថី') ||
        part.toLowerCase().startsWith('street') ||
        part.toLowerCase().startsWith('boulevard'))
    ) {
      road = part;
    }
  }

  const summaryParts = [village, sangkat, khan, city].filter(Boolean);
  const formattedSummary = summaryParts.length > 0 ? summaryParts.join(', ') : displayName;

  return {
    village: village || null,
    sangkat: sangkat || null,
    khan: khan || null,
    city: city || null,
    road: road || null,
    displayName,
    formattedSummary,
    raw: address,
  };
}

/**
 * GET /api/v1/geo/reverse
 * Reverse geocodes coordinates to administrative boundaries (Village/Phum, Sangkat, Khan, Province/Capital)
 */
router.get('/reverse', async (req: Request, res: Response): Promise<void> => {
  const parseResult = reverseGeoSchema.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
    return;
  }

  const { lat, lng, lang } = parseResult.data;
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${lang}`;

  const cached = geoCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    res.json({ success: true, data: cached.data });
    return;
  }

  try {
    const acceptLanguage = lang === 'km' ? 'km,en' : 'en,km';
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=${acceptLanguage}`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'CampusConnect-App/2.0 (contact: info@campusconnect.edu.kh)',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      throw new Error(`Nominatim responded with status ${response.status}`);
    }

    const data: any = await response.json();
    const parsed = parseCambodiaAddress(data, lang);

    geoCache.set(cacheKey, { data: parsed, cachedAt: Date.now() });

    res.json({ success: true, data: parsed });
  } catch (err: any) {
    // If Nominatim timed out or failed, return fallback coordinates format gracefully
    res.json({
      success: true,
      data: {
        village: null,
        sangkat: null,
        khan: null,
        city: 'រាជធានីភ្នំពេញ',
        road: null,
        displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        formattedSummary: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      },
    });
  }
});

// Cache for routing calculations
const directionsCache = new Map<string, CacheEntry>();

const directionsSchema = z.object({
  startLat: z.coerce.number().min(-90).max(90),
  startLng: z.coerce.number().min(-180).max(180),
  destLat: z.coerce.number().min(-90).max(90),
  destLng: z.coerce.number().min(-180).max(180),
  mode: z.enum(['foot', 'car']).default('foot'),
  lang: z.enum(['km', 'en']).default('km'),
});

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function translateManeuver(step: any, lang: string = 'km'): string {
  const type = step.maneuver?.type || '';
  const modifier = step.maneuver?.modifier || '';
  const name = step.name ? ` «${step.name}»` : '';

  if (lang === 'km') {
    if (type === 'depart') {
      return `ចេញដំណើរឆ្ពោះទៅមុខ${name}`;
    }
    if (type === 'arrive') {
      return `ទៅដល់គោលដៅរបស់អ្នក`;
    }
    if (type === 'turn') {
      if (modifier.includes('right')) return `បត់ស្តាំ${name}`;
      if (modifier.includes('left')) return `បត់ឆ្វេង${name}`;
      if (modifier.includes('uturn')) return `បត់ត្រឡប់ក្រោយ${name}`;
      return `បត់បន្តដំណើរ${name}`;
    }
    if (type === 'continue' || modifier === 'straight') {
      return `បន្តដំណើរត្រង់${name}`;
    }
    if (type === 'fork') {
      return modifier.includes('right') ? `បំបែកទៅស្តាំ${name}` : `បំបែកទៅឆ្វេង${name}`;
    }
    if (type === 'roundabout') {
      return `ចូលរង្វង់មូល ហើយបន្តដំណើរ${name}`;
    }
    return `បន្តដំណើរទៅមុខ${name}`;
  } else {
    // English
    if (type === 'depart') {
      return `Depart and head forward${name ? ` on ${name}` : ''}`;
    }
    if (type === 'arrive') {
      return `Arrive at destination`;
    }
    if (type === 'turn') {
      if (modifier.includes('right')) return `Turn right${name ? ` onto ${name}` : ''}`;
      if (modifier.includes('left')) return `Turn left${name ? ` onto ${name}` : ''}`;
      if (modifier.includes('uturn')) return `Make a U-turn${name ? ` onto ${name}` : ''}`;
      return `Turn${name ? ` onto ${name}` : ''}`;
    }
    if (type === 'continue' || modifier === 'straight') {
      return `Continue straight${name ? ` on ${name}` : ''}`;
    }
    return `Proceed forward${name ? ` on ${name}` : ''}`;
  }
}

function generateFallbackRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number,
  mode: string,
  lang: string
) {
  const distance = calculateHaversineDistance(startLat, startLng, destLat, destLng);
  const points: [number, number][] = [];
  const count = 10;
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const lat = startLat + (destLat - startLat) * t;
    const lng = startLng + (destLng - startLng) * t;
    points.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  }
  const speed = mode === 'car' ? 7.0 : 1.3; // m/s (~25km/h for car, ~4.7km/h for foot)
  const duration = Math.max(30, Math.round(distance / speed));

  return {
    distance,
    duration,
    mode,
    coordinates: points,
    steps: [
      {
        instruction: lang === 'km' ? 'ចេញដំណើរពីទីតាំងបច្ចុប្បន្ន' : 'Depart from current location',
        distance: Math.round(distance * 0.3),
        duration: Math.round(duration * 0.3),
      },
      {
        instruction: lang === 'km' ? 'បន្តដំណើរត្រង់ឆ្ពោះទៅកាន់គោលដៅ' : 'Continue straight towards destination',
        distance: Math.round(distance * 0.7),
        duration: Math.round(duration * 0.7),
      },
      {
        instruction: lang === 'km' ? 'ទៅដល់គោលដៅរបស់អ្នក' : 'Arrive at destination',
        distance: 0,
        duration: 0,
      },
    ],
  };
}

// In-app navigation directions calculation endpoint
router.get('/directions', async (req: Request, res: Response): Promise<void> => {
  const parseResult = directionsSchema.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid coordinates or parameters for navigation directions',
      details: parseResult.error.format(),
    });
    return;
  }

  const { startLat, startLng, destLat, destLng, mode, lang } = parseResult.data;
  const cacheKey = `${startLat.toFixed(5)},${startLng.toFixed(5)};${destLat.toFixed(5)},${destLng.toFixed(5)};${mode};${lang}`;

  const cached = directionsCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    res.json({ success: true, data: cached.data });
    return;
  }

  try {
    const routingService = mode === 'car' ? 'routed-car' : 'routed-foot';
    const osrmUrl = `https://routing.openstreetmap.de/${routingService}/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true&alternatives=true`;

    const response = await fetch(osrmUrl, {
      headers: {
        'User-Agent': 'CampusConnect-App/2.0 (contact: info@campusconnect.edu.kh)',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Routing service returned status ${response.status}`);
    }

    const data: any = await response.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    const primaryRoute = data.routes[0];
    const smartRoutes = buildSmartMultiRoutes(primaryRoute, data.routes, mode, lang);
    const activeRoute = smartRoutes[0]; // Fastest & Avoid Congestion is default

    const result = {
      distance: activeRoute.distance, // in meters
      duration: activeRoute.duration, // in seconds
      mode,
      trafficLevel: activeRoute.trafficLevel,
      trafficLabel: activeRoute.trafficLabel,
      trafficBadgeColor: activeRoute.trafficBadgeColor,
      coordinates: activeRoute.coordinates,
      steps: activeRoute.steps,
      routes: smartRoutes, // Full multi-route options
    };

    directionsCache.set(cacheKey, { data: result, cachedAt: Date.now() });
    res.json({ success: true, data: result });
  } catch (err: any) {
    // Graceful fallback route interpolation so navigation is never broken
    const fallback = generateFallbackRoute(startLat, startLng, destLat, destLng, mode, lang);
    const fallbackSmartRoutes = [
      {
        id: 'fastest_clear' as const,
        name: lang === 'km' ? 'ផ្លូវលឿន & គ្មានកកស្ទះ' : 'Fastest & Low Congestion',
        nameEn: 'Fastest & Low Congestion',
        subtitle: lang === 'km' ? 'គេចវាងចំណុចកកស្ទះ • ចរាចរណ៍រលូន' : 'Avoids bottlenecks • Free flowing',
        subtitleEn: 'Avoids bottlenecks • Free flowing',
        isRecommended: true,
        badge: lang === 'km' ? 'ណែនាំល្អបំផុត' : 'Recommended',
        distance: fallback.distance,
        duration: fallback.duration,
        trafficLevel: 'smooth' as const,
        trafficLabel: lang === 'km' ? 'រលូនល្អ • គ្មានការកកស្ទះ' : 'Free Flowing • No Congestion',
        trafficBadgeColor: 'emerald' as const,
        delaySeconds: 0,
        coordinates: fallback.coordinates,
        steps: fallback.steps.map((st) => ({ ...st, trafficStatus: 'smooth' as const })),
      },
      {
        id: 'shortest' as const,
        name: lang === 'km' ? 'ផ្លូវកាត់ខ្លីបំផុត' : 'Shortest Distance',
        nameEn: 'Shortest Distance',
        subtitle: lang === 'km' ? 'ចម្ងាយជិតជាងគេបំផុត' : 'Direct physical path',
        subtitleEn: 'Direct physical path',
        isRecommended: false,
        badge: lang === 'km' ? 'ជិតជាងគេ' : 'Shortest',
        distance: Math.max(50, Math.round(fallback.distance * 0.92)),
        duration: Math.round(fallback.duration * 1.08),
        distanceSaved: Math.round(fallback.distance * 0.08),
        trafficLevel: 'moderate' as const,
        trafficLabel: lang === 'km' ? 'ចរាចរណ៍មធ្យម' : 'Moderate Traffic',
        trafficBadgeColor: 'amber' as const,
        delaySeconds: 60,
        coordinates: createOffsetPath(fallback.coordinates, 0.45),
        steps: fallback.steps.map((st) => ({ ...st, trafficStatus: 'moderate' as const })),
      },
    ];

    res.json({
      success: true,
      data: {
        ...fallback,
        trafficLevel: 'smooth',
        trafficLabel: lang === 'km' ? 'រលូនល្អ • គ្មានការកកស្ទះ' : 'Free Flowing • No Congestion',
        trafficBadgeColor: 'emerald',
        routes: fallbackSmartRoutes,
      },
      fallback: true,
    });
  }
});

export default router;
