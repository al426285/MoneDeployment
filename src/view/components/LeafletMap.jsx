import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});


const iconSalida = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const iconDestino = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapCenterer({ center }) {
  const map = useMap();
  React.useEffect(() => {
    if (!map || !center) return;
    map.setView(center, map.getZoom(), { animate: true });
  }, [map, center]);
  return null;
}

function ClickSetter({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (typeof onMapClick === "function") {
        onMapClick([Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))]);
      }
    },
  });
  return null;
}

function AutoFitBounds({ markers = [], polyline = [], enabled = false, padding = [100, 100] }) {
  const map = useMap();

  React.useEffect(() => {
    if (!enabled || !map) return;

    const rawPoints = polyline?.length >= 2 ? polyline : markers;
    if (!rawPoints || rawPoints.length < 2) return;

    const points = rawPoints.map((p) => {
      const [lat, lng] = Array.isArray(p) ? p : [p.lat, p.lng];
      return L.latLng(Number(lat), Number(lng));
    });

    const bounds = L.latLngBounds(points);
    if (!bounds.isValid()) return;

    map.invalidateSize(true);
    requestAnimationFrame(() => {
      map.fitBounds(bounds.pad(0.15), { padding, animate: true });
    });
  }, [enabled, markers, polyline, padding, map]);
  return null;
}

export default function LeafletMap({
  center = [39.99256, -0.067387],
  zoom = 13,
  markers = [],
  polyline = [],
  polylineOptions,
  onMapClick,
  autoFitBounds = false,
  highlightDestination = true,
  style,
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={2}
      scrollWheelZoom
      maxBounds={[[-85, -180], [85, 180]]}
      maxBoundsViscosity={1}
      worldCopyJump={false}
      style={{ width: "100%", height: "100%", minHeight: 420, ...(style || {}) }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
        noWrap
      />
      <ClickSetter onMapClick={onMapClick} />
      {!autoFitBounds && <MapCenterer center={center} />}
      {autoFitBounds && <AutoFitBounds markers={markers} polyline={polyline} enabled />}
      {markers.map((pos, i) => {
        // pos can be:
        // - an array [lat, lng]
        // - an object { coords: [lat, lng], role: 'origin'|'destination' }
        const rawCoords = Array.isArray(pos) ? pos : pos?.coords ?? pos;
        const coords = [Number(rawCoords[0]), Number(rawCoords[1])];
        const role = pos && !Array.isArray(pos) ? pos.role : undefined;

        // Decide destination status: prefer explicit role, otherwise fall back to index-based logic
        const isDestination = role === "destination" || (highlightDestination && markers.length >= 2 && i === markers.length - 1);
        const markerProps = highlightDestination ? { icon: isDestination ? iconDestino : iconSalida } : {};

        const label = role === "origin" ? "Start" : role === "destination" ? "End" : i === 0 ? "Start" : "End";

        return (
          <Marker key={i} position={coords} {...markerProps}>
            <Popup>{label}: {coords[0]}, {coords[1]}</Popup>
          </Marker>
        );
      })}
      {polyline?.length >= 2 && (
        <Polyline
          positions={polyline.map((p) => (Array.isArray(p) ? [Number(p[0]), Number(p[1])] : [p.lat, p.lng]))}
          pathOptions={polylineOptions || { color: "#2d6cdf", weight: 5 }}
        />
      )}
    </MapContainer>
  );
}