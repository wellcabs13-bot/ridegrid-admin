"use client";

import { useEffect, useRef, useState } from "react";

type Coordinates = {
  lat: number;
  lng: number;
};

type LocationMapPickerProps = {
  label: string;
  value: string;
  initialQuery?: string;
  onChange: (address: string, coordinates: Coordinates) => void;
  onClose: () => void;
};

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };

export default function LocationMapPicker({
  label,
  value,
  initialQuery,
  onChange,
  onClose,
}: LocationMapPickerProps) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

  const [query, setQuery] = useState(value || initialQuery || "");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(value || initialQuery || "");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [mapError, setMapError] = useState("");

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
          lat
        )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Unable to read this location.");

      const data = await response.json();
      return String(data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }

  async function setPoint(lat: number, lng: number, updateAddress = true) {
    const point = { lat, lng };
    setCoordinates(point);

    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 16));
    }

    if (updateAddress) {
      const address = await reverseGeocode(lat, lng);
      setSelectedAddress(address);
      setQuery(address);
    }
  }

  async function searchLocation() {
    const search = query.trim();
    if (!search) return;

    setSearching(true);
    setMapError("");

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(
          search
        )}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Location search is unavailable.");

      const results = (await response.json()) as SearchResult[];
      setSearchResults(results);

      if (results.length === 0) {
        setMapError("No matching location found. Try a more complete address.");
        return;
      }

      const first = results[0];
      await setPoint(Number(first.lat), Number(first.lon), false);
      setSelectedAddress(first.display_name);
      setQuery(first.display_name);
      setSearchResults([]);
    } catch (error) {
      setMapError(error instanceof Error ? error.message : "Location search failed.");
    } finally {
      setSearching(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMapError("Your browser does not support location access.");
      return;
    }

    setLocating(true);
    setMapError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await setPoint(position.coords.latitude, position.coords.longitude);
        setLocating(false);
      },
      () => {
        setMapError("Unable to access your current location. Please allow location permission.");
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function loadLeaflet() {
      try {
        if (!(window as any).L) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector(
              'script[data-ridegrid-leaflet="true"]'
            ) as HTMLScriptElement | null;

            if (existing) {
              existing.addEventListener("load", () => resolve(), { once: true });
              existing.addEventListener("error", () => reject(new Error("Map library failed to load.")), {
                once: true,
              });
              return;
            }

            const script = document.createElement("script");
            script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            script.async = true;
            script.dataset.ridegridLeaflet = "true";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Map library failed to load."));
            document.head.appendChild(script);
          });
        }

        if (cancelled || !mapElement.current) return;

        const L = (window as any).L;
        leafletRef.current = L;

        if (!mapRef.current) {
          mapRef.current = L.map(mapElement.current, {
            zoomControl: true,
            attributionControl: true,
          }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 5);

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(mapRef.current);

          mapRef.current.on("click", async (event: any) => {
            await setPoint(event.latlng.lat, event.latlng.lng);
          });
        }

        if (initialQuery || value) {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
                value || initialQuery || ""
              )}`,
              {
                headers: {
                  Accept: "application/json",
                },
              }
            );

            if (response.ok) {
              const results = (await response.json()) as SearchResult[];
              if (!cancelled && results[0]) {
                await setPoint(Number(results[0].lat), Number(results[0].lon), false);
                setSelectedAddress(value || results[0].display_name);
              }
            }
          } catch {
            // The customer can still select a point manually.
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMapError(error instanceof Error ? error.message : "Unable to load map.");
        }
      }
    }

    loadLeaflet();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    if (!L || !mapRef.current || !coordinates) return;

    if (!markerRef.current) {
      markerRef.current = L.marker([coordinates.lat, coordinates.lng], {
        draggable: true,
      }).addTo(mapRef.current);

      markerRef.current.on("dragend", async () => {
        const position = markerRef.current.getLatLng();
        await setPoint(position.lat, position.lng);
      });
    } else {
      markerRef.current.setLatLng([coordinates.lat, coordinates.lng]);
    }

    mapRef.current.setView([coordinates.lat, coordinates.lng], Math.max(mapRef.current.getZoom(), 16));
  }, [coordinates]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  function confirmLocation() {
    if (!coordinates) {
      setMapError("Please select an exact point on the map first.");
      return;
    }

    onChange(selectedAddress || `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`, coordinates);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-600">
              Exact Location
            </p>
            <h3 className="text-xl font-black text-slate-900">{label}</h3>
            <p className="text-xs text-slate-500">
              Search, click the map, or drag the pin to the exact pickup/drop point.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="border-b bg-slate-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") searchLocation();
              }}
              placeholder="Search complete address, landmark or area"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={searchLocation}
              disabled={searching}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {searching ? "Searching..." : "Search"}
            </button>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-black text-blue-700 disabled:opacity-60"
            >
              {locating ? "Locating..." : "Use My Location"}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 overflow-hidden rounded-xl border bg-white">
              {searchResults.map((result) => (
                <button
                  key={`${result.lat}-${result.lon}`}
                  type="button"
                  onClick={async () => {
                    await setPoint(Number(result.lat), Number(result.lon), false);
                    setSelectedAddress(result.display_name);
                    setQuery(result.display_name);
                    setSearchResults([]);
                  }}
                  className="block w-full border-b px-4 py-3 text-left text-sm last:border-b-0 hover:bg-slate-50"
                >
                  {result.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative min-h-0 flex-1 p-4">
          <div ref={mapElement} className="h-[48vh] min-h-[340px] w-full rounded-2xl border border-slate-200" />

          <div className="absolute bottom-8 left-8 right-8 rounded-2xl border bg-white/95 p-4 shadow-lg backdrop-blur">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Selected {label}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800">
              {selectedAddress || "Click the map to select an exact point."}
            </p>
            {coordinates && (
              <p className="mt-1 text-xs text-slate-500">
                GPS: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
              </p>
            )}
          </div>
        </div>

        {mapError && (
          <div className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {mapError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-white px-5 py-4">
          <p className="text-xs text-slate-500">
            Map data © OpenStreetMap contributors. Exact GPS coordinates will be retained with the booking draft.
          </p>
          <button
            type="button"
            onClick={confirmLocation}
            className="rounded-xl bg-cyan-500 px-6 py-3 text-sm font-black text-slate-950 hover:bg-cyan-400"
          >
            Confirm This Location
          </button>
        </div>
      </div>
    </div>
  );
}
