"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue in Leaflet + bundlers
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LeafletMapProps {
  lat: number | null;
  lng: number | null;
  onMapClick: (lat: number, lng: number) => void;
}

// Component to listen to map clicks
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to re-center map when lat/lng changes from outside (e.g. geolocation)
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 16, { duration: 1 });
  }, [lat, lng, map]);
  return null;
}

export default function LeafletMap({ lat, lng, onMapClick }: LeafletMapProps) {
  // Default center: Jakarta
  const center: [number, number] = lat !== null && lng !== null ? [lat, lng] : [-6.2, 106.816];
  const zoom = lat !== null ? 16 : 12;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      attributionControl={false}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onMapClick={onMapClick} />
      {lat !== null && lng !== null && (
        <>
          <Marker position={[lat, lng]} icon={defaultIcon} />
          <MapRecenter lat={lat} lng={lng} />
        </>
      )}
    </MapContainer>
  );
}
