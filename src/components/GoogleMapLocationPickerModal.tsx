/// <reference types="@types/google.maps" />
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  X,
  MapPin,
  Navigation,
  Search,
  Check,
  AlertCircle,
  Compass,
  Store,
  RotateCcw,
} from 'lucide-react';
import { calculateHaversineDistanceKm, formatDistanceDisplay } from '../utils/distance';

interface GoogleMapLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationConfirmed: (locationData: {
    address: string;
    landmark?: string;
    pincode?: string;
    city?: string;
    lat: number;
    lng: number;
    distanceKm: number;
  }) => void;
  initialLat?: number | null;
  initialLng?: number | null;
  restaurantLat?: number;
  restaurantLng?: number;
  restaurantCity?: string;
  maxRadiusKm?: number;
}

// Inner component that interacts with Map instance and Places Autocomplete
interface MapContentProps {
  currentPos: { lat: number; lng: number };
  onPosChange: (lat: number, lng: number) => void;
  restaurantLat: number;
  restaurantLng: number;
  onDetectGPS: () => void;
  detectingGPS: boolean;
  gpsNotice: string | null;
}

const MapContent: React.FC<MapContentProps> = ({
  currentPos,
  onPosChange,
  restaurantLat,
  restaurantLng,
  onDetectGPS,
  detectingGPS,
  gpsNotice,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasModernAutocomplete, setHasModernAutocomplete] = useState(false);

  // Modern PlaceAutocompleteElement (replaces deprecated places.Autocomplete)
  useEffect(() => {
    if (!placesLib || !autocompleteContainerRef.current) return;

    const container = autocompleteContainerRef.current;
    container.innerHTML = '';

    if ((placesLib as any).PlaceAutocompleteElement) {
      try {
        const placeAutocomplete = new (placesLib as any).PlaceAutocompleteElement({
          internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
        });

        placeAutocomplete.style.width = '100%';
        placeAutocomplete.style.minHeight = '38px';

        const handlePlaceSelect = async (e: any) => {
          const place = e.place || e.detail?.place;
          if (place) {
            if (typeof place.fetchFields === 'function') {
              await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
            }
            if (place.location) {
              const lat = typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat;
              const lng = typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng;
              onPosChange(lat, lng);
              if (map) {
                map.panTo({ lat, lng });
                map.setZoom(16);
              }
            }
          }
        };

        placeAutocomplete.addEventListener('gmp-placeselect', handlePlaceSelect);
        container.appendChild(placeAutocomplete);
        setHasModernAutocomplete(true);

        return () => {
          placeAutocomplete.removeEventListener('gmp-placeselect', handlePlaceSelect);
          container.innerHTML = '';
        };
      } catch (err) {
        console.warn('PlaceAutocompleteElement init:', err);
      }
    }
  }, [placesLib, map, onPosChange]);

  // Fast manual address/place search fallback via geocoding
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`/api/geocode/forward?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.lat && data.lng) {
          onPosChange(data.lat, data.lng);
          if (map) {
            map.panTo({ lat: data.lat, lng: data.lng });
            map.setZoom(16);
          }
        }
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  // Center map on position update if initiated externally
  const handleMapClick = (e: any) => {
    if (e.detail?.latLng) {
      onPosChange(e.detail.latLng.lat, e.detail.latLng.lng);
    }
  };

  const handleMarkerDragEnd = (e: any) => {
    if (e.latLng) {
      onPosChange(e.latLng.lat(), e.latLng.lng());
    }
  };

  return (
    <>
      {/* Places Search Bar and Live GPS Button overlay */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex flex-col gap-1">
          {/* Modern PlaceAutocompleteElement Container */}
          <div
            ref={autocompleteContainerRef}
            className={`${hasModernAutocomplete ? 'block' : 'hidden'} w-full bg-white/95 rounded-xl shadow-md overflow-hidden`}
          />

          {/* Quick Search Form if PlaceAutocompleteElement is loading or for direct query */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 flex items-center">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search building, street, or landmark on Google Maps..."
              className="w-full pl-9 pr-16 py-2.5 bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl text-xs text-slate-900 shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="absolute right-1.5 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-[10px] transition"
            >
              {searching ? 'Finding...' : 'Search'}
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={onDetectGPS}
          disabled={detectingGPS}
          className="shrink-0 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md transition self-start"
        >
          <Compass className={`w-4 h-4 ${detectingGPS ? 'animate-spin' : ''}`} />
          <span>{detectingGPS ? 'Detecting GPS...' : '📍 Real GPS Location'}</span>
        </button>
      </div>

      {gpsNotice && (
        <div className="absolute top-16 left-3 right-3 z-10 p-2.5 bg-amber-500/90 text-slate-950 text-xs font-semibold rounded-xl shadow-lg flex items-center space-x-2 backdrop-blur-md">
          <Compass className="w-4 h-4 shrink-0" />
          <span>{gpsNotice}</span>
        </div>
      )}

      {/* Google Map Instance with Mandatory Internal Usage Attribution */}
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={currentPos}
        defaultZoom={15}
        gestureHandling="greedy"
        disableDefaultUI={false}
        onClick={handleMapClick}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        className="w-full h-full min-h-[380px]"
      >
        {/* Customer Target Marker */}
        <AdvancedMarker
          position={currentPos}
          draggable={true}
          onDragEnd={handleMarkerDragEnd}
          title="Drag pin to your exact delivery location"
        >
          <Pin
            background="#ea580c"
            borderColor="#9a3412"
            glyphColor="#ffffff"
            scale={1.2}
          />
        </AdvancedMarker>

        {/* Restaurant Kitchen Marker */}
        <AdvancedMarker
          position={{ lat: restaurantLat, lng: restaurantLng }}
          title="Kitchen Cruze - Kitchen Promenade"
        >
          <div className="bg-slate-900 text-amber-400 p-1.5 rounded-full border-2 border-amber-400 shadow-lg flex items-center justify-center">
            <Store className="w-4 h-4" />
          </div>
        </AdvancedMarker>
      </Map>
    </>
  );
};

export const GoogleMapLocationPickerModal: React.FC<GoogleMapLocationPickerModalProps> = ({
  isOpen,
  onClose,
  onLocationConfirmed,
  initialLat,
  initialLng,
  restaurantLat = 19.076,
  restaurantLng = 72.8777,
  restaurantCity = 'Mumbai',
  maxRadiusKm = 5,
}) => {
  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    'AIzaSyCveCebhXSErqoQaTi-SiB5CjeoTKNwkpE';

  const defaultCenter = {
    lat: initialLat || restaurantLat + 0.0075,
    lng: initialLng || restaurantLng + 0.0075,
  };

  const [pinnedPos, setPinnedPos] = useState(defaultCenter);
  const [addressDetails, setAddressDetails] = useState<{
    formattedAddress: string;
    street: string;
    suburb: string;
    city: string;
    pincode: string;
    landmark: string;
  }>({
    formattedAddress: '',
    street: '',
    suburb: '',
    city: restaurantCity,
    pincode: '',
    landmark: '',
  });

  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [detectingGPS, setDetectingGPS] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  // Sync initial position when modal opens
  useEffect(() => {
    if (isOpen) {
      const pos = {
        lat: initialLat || restaurantLat + 0.0075,
        lng: initialLng || restaurantLng + 0.0075,
      };
      setPinnedPos(pos);
      resolveAddressForCoordinates(pos.lat, pos.lng);
    }
  }, [isOpen, initialLat, initialLng, restaurantLat, restaurantLng]);

  // Calculate distance from restaurant
  const distanceKm = calculateHaversineDistanceKm(
    restaurantLat,
    restaurantLng,
    pinnedPos.lat,
    pinnedPos.lng
  );
  const distanceDisplay = formatDistanceDisplay(distanceKm);
  const isWithinRadius = distanceKm <= maxRadiusKm;

  // Reverse geocode via server / Google geocoder
  const resolveAddressForCoordinates = useCallback(
    async (lat: number, lng: number) => {
      setResolvingAddress(true);
      try {
        const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
        if (res.ok) {
          const data = await res.json();
          setAddressDetails({
            formattedAddress: data.formattedAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            street: data.street || '',
            suburb: data.suburb || '',
            city: data.city || restaurantCity,
            pincode: data.pincode || '',
            landmark: data.suburb || data.street || '',
          });
        }
      } catch (err) {
        console.error('Failed to reverse geocode:', err);
      } finally {
        setResolvingAddress(false);
      }
    },
    [restaurantCity]
  );

  const handlePositionChanged = (newLat: number, newLng: number) => {
    const roundedLat = parseFloat(newLat.toFixed(6));
    const roundedLng = parseFloat(newLng.toFixed(6));
    setPinnedPos({ lat: roundedLat, lng: roundedLng });
    resolveAddressForCoordinates(roundedLat, roundedLng);
  };

  // Real GPS detection triggered from Google Map
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsNotice('Geolocation not supported in this browser. You can click on the Google Map to pick location.');
      setTimeout(() => setGpsNotice(null), 4000);
      return;
    }

    setDetectingGPS(true);
    setGpsNotice('Requesting live device GPS coordinates...');

    const onPosSuccess = (pos: GeolocationPosition) => {
      const liveLat = parseFloat(pos.coords.latitude.toFixed(6));
      const liveLng = parseFloat(pos.coords.longitude.toFixed(6));
      setPinnedPos({ lat: liveLat, lng: liveLng });
      resolveAddressForCoordinates(liveLat, liveLng);
      setDetectingGPS(false);

      const liveDist = calculateHaversineDistanceKm(restaurantLat, restaurantLng, liveLat, liveLng);
      if (liveDist <= maxRadiusKm) {
        setGpsNotice(`Real GPS Located! (${formatDistanceDisplay(liveDist)} from kitchen ✅)`);
      } else {
        setGpsNotice(
          `Real GPS detected (${formatDistanceDisplay(liveDist)} away). Pinned on map.`
        );
      }
      setTimeout(() => setGpsNotice(null), 5000);
    };

    const onPosError = (err: GeolocationPositionError) => {
      if (err.code === 3 || err.code === 2) {
        // Fallback to standard accuracy
        navigator.geolocation.getCurrentPosition(
          onPosSuccess,
          (err2) => {
            setDetectingGPS(false);
            setGpsNotice(`GPS notice: ${err2.message}. Click on Google Map to select location.`);
            setTimeout(() => setGpsNotice(null), 4000);
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
        );
      } else {
        setDetectingGPS(false);
        setGpsNotice(`Location access notice: ${err.message}. You can click anywhere on the Google Map.`);
        setTimeout(() => setGpsNotice(null), 4500);
      }
    };

    navigator.geolocation.getCurrentPosition(onPosSuccess, onPosError, {
      enableHighAccuracy: true,
      timeout: 6000,
      maximumAge: 0,
    });
  };

  const handleConfirm = () => {
    onLocationConfirmed({
      address: addressDetails.formattedAddress || addressDetails.street || `${pinnedPos.lat}, ${pinnedPos.lng}`,
      landmark: addressDetails.landmark,
      pincode: addressDetails.pincode,
      city: addressDetails.city,
      lat: pinnedPos.lat,
      lng: pinnedPos.lng,
      distanceKm,
    });
    onClose();
  };

  const handleCenterOnKitchen = () => {
    const kitchenPos = {
      lat: parseFloat((restaurantLat + 0.0075).toFixed(6)),
      lng: parseFloat((restaurantLng + 0.0075).toFixed(6)),
    };
    setPinnedPos(kitchenPos);
    resolveAddressForCoordinates(kitchenPos.lat, kitchenPos.lng);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden border border-slate-200 max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Choose Delivery Location on Google Map
              </h3>
              <p className="text-[11px] text-slate-500">
                Click anywhere on the map or drag the pin to set your exact doorstep
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Container */}
        <div className="relative w-full h-[360px] sm:h-[400px] bg-slate-100">
          <APIProvider
            apiKey={apiKey}
            solutionChannel="GMP_devsite_samples_v3_rgmautocomplete"
          >
            <MapContent
              currentPos={pinnedPos}
              onPosChange={handlePositionChanged}
              restaurantLat={restaurantLat}
              restaurantLng={restaurantLng}
              onDetectGPS={handleDetectGPS}
              detectingGPS={detectingGPS}
              gpsNotice={gpsNotice}
            />
          </APIProvider>
        </div>

        {/* Bottom Location Confirmation Panel */}
        <div className="p-4 bg-white border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            {/* Resolved Address & Coordinates */}
            <div className="space-y-1 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Selected Delivery Address
                </span>
                {resolvingAddress && (
                  <span className="text-[10px] text-amber-600 font-semibold animate-pulse">
                    Resolving street...
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-900 line-clamp-2">
                {addressDetails.formattedAddress || 'Locating address details...'}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-medium">
                {addressDetails.landmark && <span>Landmark: {addressDetails.landmark}</span>}
                {addressDetails.pincode && <span>Pincode: {addressDetails.pincode}</span>}
                <span className="font-mono text-slate-400">
                  ({pinnedPos.lat.toFixed(4)}, {pinnedPos.lng.toFixed(4)})
                </span>
              </div>
            </div>

            {/* Distance Badge */}
            <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between">
              <span
                className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center space-x-1.5 border ${
                  isWithinRadius
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border-rose-300 text-rose-700'
                }`}
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {distanceDisplay} {isWithinRadius ? '✅' : '❌'}
                </span>
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {isWithinRadius
                  ? `Inside ${maxRadiusKm} KM delivery area`
                  : `Exceeds ${maxRadiusKm} KM delivery limit`}
              </span>
            </div>
          </div>

          {/* Warning if outside delivery radius */}
          {!isWithinRadius && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-[11px]">
                  This location is {distanceDisplay} away, which is outside our {maxRadiusKm} KM delivery zone.
                </span>
              </div>
              <button
                type="button"
                onClick={handleCenterOnKitchen}
                className="shrink-0 text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-lg transition"
              >
                Pin Inside Zone
              </button>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-xl flex items-center space-x-1.5 shadow-md active:scale-95 transition"
            >
              <Check className="w-4 h-4" />
              <span>Use This Pinned Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
