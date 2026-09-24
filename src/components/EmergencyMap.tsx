import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

/** Real OpenStreetMap tiles rendered with Leaflet — no mock map imagery. */
export function EmergencyMap({
  lat,
  lng,
  accuracy,
}: {
  lat: number;
  lng: number;
  accuracy?: number | null;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(ref.current, { scrollWheelZoom: false }).setView([lat, lng], 16);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(mapRef.current);
      }
      const map = mapRef.current;
      map.setView([lat, lng], 16);
      L.circleMarker([lat, lng], { radius: 9, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.9 }).addTo(map);
      if (accuracy) {
        L.circle([lat, lng], { radius: accuracy, color: "#ef4444", opacity: 0.4, fillOpacity: 0.08 }).addTo(map);
      }
      setTimeout(() => map.invalidateSize(), 120);
    })();
    return () => {
      cancelled = true;
    };
  }, [lat, lng, accuracy]);

  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
    },
    [],
  );

  return <div ref={ref} className="h-72 w-full rounded-2xl border border-border" aria-label="Map of the emergency location" />;
}

export default EmergencyMap;
