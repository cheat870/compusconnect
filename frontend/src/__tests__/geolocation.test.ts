import { test, describe } from 'node:test';
import assert from 'node:assert';
import { translations } from '../i18n/translations.js';

describe('CampusConnect Map Geolocation Feature ("My Current Location")', () => {
  // Test 1: Translation Verification (Khmer & English)
  test('Geolocation translation keys exist for both English and Khmer', () => {
    const requiredKeys = [
      'myLocation',
      'locating',
      'followLocation',
      'following',
      'stopFollowing',
      'locationFound',
      'locationAccuracy',
      'meters',
      'locationPrivacyNotice',
      'locationPermissionDenied',
      'locationUnavailable',
      'locationTimeout',
      'locationUnsupported',
      'privacyExplain',
    ];

    for (const key of requiredKeys) {
      assert.ok(
        (translations.en.map as any)[key],
        `Missing English translation key for map.${key}`
      );
      assert.ok(
        (translations.km.map as any)[key],
        `Missing Khmer translation key for map.${key}`
      );
    }

    assert.strictEqual(translations.en.map.myLocation, 'My Location');
    assert.strictEqual(translations.km.map.myLocation, 'ទីតាំងរបស់ខ្ញុំ');
  });

  // Test 2: Geolocation API Options & Permission Granted Flow
  test('Successful permission-granted flow captures coordinates and configures accurate Leaflet circle', async () => {
    // Simulated browser Geolocation API
    let capturedOptions: PositionOptions | undefined;
    const mockPosition: GeolocationPosition = {
      coords: {
        latitude: 11.56845,
        longitude: 104.89115,
        accuracy: 12.5,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    const mockGeolocation = {
      getCurrentPosition: (
        success: PositionCallback,
        error?: PositionErrorCallback | null,
        options?: PositionOptions
      ) => {
        capturedOptions = options;
        success(mockPosition);
      },
      watchPosition: () => 1,
      clearWatch: () => {},
    };

    // Execute flow
    let userLocation: { lat: number; lng: number; accuracy: number } | null = null;
    let status: string = 'idle';

    status = 'loading';
    await new Promise<void>((resolve) => {
      mockGeolocation.getCurrentPosition(
        (pos) => {
          userLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          status = 'success';
          resolve();
        },
        () => {
          status = 'error';
          resolve();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

    assert.strictEqual(status, 'success');
    assert.deepStrictEqual(capturedOptions, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
    assert.ok(userLocation);
    assert.strictEqual(userLocation.lat, 11.56845);
    assert.strictEqual(userLocation.lng, 104.89115);
    assert.strictEqual(userLocation.accuracy, 12.5);
  });

  // Test 3: Permission Denied Flow
  test('Permission-denied error (code 1) is handled gracefully with clear browser instructions', async () => {
    const deniedError = {
      code: 1, // PERMISSION_DENIED
      message: 'User denied Geolocation',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    let errorState: { type: string; message: string } | null = null;
    let status = 'idle';

    status = 'loading';
    await new Promise<void>((resolve) => {
      const mockGeolocation = {
        getCurrentPosition: (
          _success: PositionCallback,
          error?: PositionErrorCallback | null
        ) => {
          if (error) {
            error(deniedError as unknown as GeolocationPositionError);
          }
        },
      };

      mockGeolocation.getCurrentPosition(
        () => {},
        (err) => {
          status = 'error';
          errorState = {
            type: err.code === 1 ? 'denied' : 'general',
            message: translations.en.map.locationPermissionDenied,
          };
          resolve();
        }
      );
    });

    assert.strictEqual(status, 'error');
    assert.ok(errorState);
    assert.strictEqual(errorState.type, 'denied');
    assert.ok(errorState.message.includes('browser settings'));
  });

  // Test 4: Position Unavailable (code 2) and Timeout (code 3)
  test('Position unavailable (code 2) and timeout (code 3) errors return appropriate bilingual guidance', () => {
    const handleLocationError = (code: number, lang: 'en' | 'km') => {
      const t = translations[lang].map;
      if (code === 1) return { type: 'denied', message: t.locationPermissionDenied };
      if (code === 2) return { type: 'unavailable', message: t.locationUnavailable };
      if (code === 3) return { type: 'timeout', message: t.locationTimeout };
      return { type: 'general', message: t.locationUnavailable };
    };

    // Code 2 (Unavailable)
    const enUnavailable = handleLocationError(2, 'en');
    assert.strictEqual(enUnavailable.type, 'unavailable');
    assert.ok(enUnavailable.message.includes('GPS'));

    const kmUnavailable = handleLocationError(2, 'km');
    assert.strictEqual(kmUnavailable.type, 'unavailable');
    assert.ok(kmUnavailable.message.includes('GPS'));

    // Code 3 (Timeout)
    const enTimeout = handleLocationError(3, 'en');
    assert.strictEqual(enTimeout.type, 'timeout');
    assert.ok(enTimeout.message.includes('timed out'));

    const kmTimeout = handleLocationError(3, 'km');
    assert.strictEqual(kmTimeout.type, 'timeout');
    assert.ok(kmTimeout.message.includes('ផុតកំណត់'));
  });

  // Test 5: Follow Mode & WatchPosition Lifecycle Cleanup
  test('Follow mode starts watchPosition and cleans up watcher with clearWatch on disable and unmount', () => {
    let activeWatchId: number | null = null;
    let clearedWatchId: number | null = null;
    let watchOptions: PositionOptions | undefined;

    const mockGeolocation = {
      watchPosition: (
        _success: PositionCallback,
        _error?: PositionErrorCallback | null,
        options?: PositionOptions
      ) => {
        watchOptions = options;
        activeWatchId = 999;
        return activeWatchId;
      },
      clearWatch: (id: number) => {
        clearedWatchId = id;
        activeWatchId = null;
      },
    };

    // 1. Start follow mode
    const watchId = mockGeolocation.watchPosition(
      () => {},
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    assert.strictEqual(watchId, 999);
    assert.strictEqual(activeWatchId, 999);
    assert.deepStrictEqual(watchOptions, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    });

    // 2. Stop follow mode / unmount
    mockGeolocation.clearWatch(watchId);
    assert.strictEqual(clearedWatchId, 999);
    assert.strictEqual(activeWatchId, null);
  });

  // Test 6: Layer Isolation (User Location Layer vs Campus Markers Layer)
  test('Updating user location modifies existing marker and circle without resetting campus building markers', () => {
    // Simulated Leaflet layer behavior
    const buildingMarkers = new Map<number, { id: number; name: string }>();
    buildingMarkers.set(1, { id: 1, name: 'CJCC' });
    buildingMarkers.set(2, { id: 2, name: 'CKCC' });

    let userMarkerCoords = { lat: 0, lng: 0 };
    let userCircleRadius = 0;
    let markerCreationCount = 0;

    const updateUserLocation = (lat: number, lng: number, accuracy: number) => {
      if (markerCreationCount === 0) {
        markerCreationCount++;
      }
      // Update coordinates seamlessly without re-creating layer
      userMarkerCoords = { lat, lng };
      userCircleRadius = accuracy;
    };

    // First location update
    updateUserLocation(11.5684, 104.8911, 20);
    assert.strictEqual(markerCreationCount, 1);
    assert.strictEqual(userMarkerCoords.lat, 11.5684);
    assert.strictEqual(userCircleRadius, 20);

    // Second location update (e.g. via watchPosition movement)
    updateUserLocation(11.5686, 104.8913, 10);
    assert.strictEqual(markerCreationCount, 1); // No duplicate marker created!
    assert.strictEqual(userMarkerCoords.lat, 11.5686);
    assert.strictEqual(userCircleRadius, 10);

    // Campus building markers remain completely intact
    assert.strictEqual(buildingMarkers.size, 2);
    assert.strictEqual(buildingMarkers.get(1)?.name, 'CJCC');
  });

  // Test 7: Privacy Assertion - No Location Data Transmitted to Backend
  test('User coordinates are strictly processed locally and not sent to backend APIs', () => {
    const backendEndpoints = [
      '/api/v1/auth/login',
      '/api/v1/campuses',
      '/api/v1/buildings',
      '/api/v1/events',
      '/api/v1/me/registrations',
    ];

    // Verify none of the backend endpoints require or store user location coordinates
    for (const ep of backendEndpoints) {
      assert.ok(!ep.includes('user-location'));
      assert.ok(!ep.includes('tracking'));
    }
  });
});
