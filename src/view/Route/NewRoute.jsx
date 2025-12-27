// filepath: c:\Users\ervig\Documents\Projecto App Maps Mone\ProjectMone\mone\src\components\SearchRoute.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../core/context/AuthContext";
import CustomSwal from "../../core/utils/CustomSwal";
import LeafletMap from "../components/LeafletMap";
import SavedPlacesModal from "../components/SavedPlacesModal";
import MobilitySelector from "../components/MobilitySelector";
import RouteTypeSelector from "../components/RouteTypeSelector";
import SelectVehicle from "../components/SelectVehicle";
import LocationInput from "../components/LocationInput";
import { useRouteViewmodel } from "../../viewmodel/routeViewmodel";

const DEFAULT_CENTER = [39.99256, -0.067387];
const createLocationState = () => ({ value: "", coords: null, error: "" });
const formatLatLng = ([lat, lng]) => `${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
const parseCoordsFromString = (text) => {
  if (!text) return null;
  const parts = text.split(",").map((piece) => parseFloat(piece.trim()));
  if (parts.length !== 2) return null;
  const [lat, lng] = parts;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
};

export default function SearchRoute() {
  const { user } = useAuth?.() ?? { user: null };
  const { loading, error: requestError, previewRoute: previewRouteVm, searchRoute, reset: resetRouteVm } = useRouteViewmodel();

  const [origin, setOrigin] = useState(() => createLocationState());
  const [destination, setDestination] = useState(() => createLocationState());
  const [name, setName] = useState("");
  const [mobility, setMobility] = useState("vehicle");  // vehicle | bike | walk
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [routeType, setRouteType] = useState("fastest"); // fastest | shortest | scenic

  const [polyline, setPolyline] = useState([]); // [[lat,lng], ...]
  const [center, setCenter] = useState(DEFAULT_CENTER); // default
  const [error, setError] = useState("");
  const [hasPreview, setHasPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // nuevo: modal / saved places
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedMode, setSavedMode] = useState("origin"); // "origin" | "destination"

  const mutateLocation = (key, updater) => {
    if (key === "origin") {
      setOrigin((prev) => updater(prev));
    } else {
      setDestination((prev) => updater(prev));
    }
  };

  const invalidatePreview = () => {
    setPolyline([]);
    setHasPreview(false);
    setError("");
    resetRouteVm();
  };

  const handleLocationValueChange = (key, nextValue) => {
    invalidatePreview();
    mutateLocation(key, (prev) => ({ ...prev, value: nextValue, error: "" }));
  };

  const handleLocationCoordsChange = (key, coords, label, options = {}) => {
    const { invalidatePreview: shouldInvalidate = true } = options;
    if (shouldInvalidate) invalidatePreview();
    if (!Array.isArray(coords) || coords.length !== 2) {
      mutateLocation(key, (prev) => ({ ...prev, coords: null }));
      return;
    }
    const [lat, lng] = coords.map((piece) => Number(piece));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const formatted = label ?? formatLatLng([lat, lng]);
    mutateLocation(key, () => ({ value: formatted, coords: [lat, lng], error: "" }));
  };
  const resolveCoords = (key, state) => {
    if (state.coords) return state.coords;
    const parsed = parseCoordsFromString(state.value);
    if (parsed) {
      handleLocationCoordsChange(key, parsed, formatLatLng(parsed), { invalidatePreview: false });
      return parsed;
    }
    mutateLocation(key, (prev) => ({ ...prev, error: "Introduce coordenadas válidas o selecciona un lugar." }));
    return null;
  };

  const markers = useMemo(() => {
    if (polyline.length >= 2) {
      return [
        { coords: polyline[0], role: "origin" },
        { coords: polyline[polyline.length - 1], role: "destination" },
      ];
    }
    const next = [];
    if (origin.coords) next.push({ coords: origin.coords, role: "origin" });
    if (destination.coords) next.push({ coords: destination.coords, role: "destination" });
    return next;
  }, [origin.coords, destination.coords, polyline]);

  useEffect(() => {
    if (polyline.length >= 2) {
      const mid = polyline[Math.floor(polyline.length / 2)];
      setCenter([mid[0], mid[1]]);
      return;
    }
    if (origin.coords && destination.coords) {
      setCenter([
        (origin.coords[0] + destination.coords[0]) / 2,
        (origin.coords[1] + destination.coords[1]) / 2,
      ]);
      return;
    }
    if (origin.coords) {
      setCenter(origin.coords);
      return;
    }
    if (destination.coords) {
      setCenter(destination.coords);
      return;
    }
    setCenter(DEFAULT_CENTER);
  }, [origin.coords, destination.coords, polyline]);

  const openSavedModal = (mode) => {
    setSavedMode(mode);
    setShowSavedModal(true);
  };
  const closeSavedModal = () => setShowSavedModal(false);

  const handleReset = () => {
    invalidatePreview();
    setOrigin(createLocationState());
    setDestination(createLocationState());
    setCenter(DEFAULT_CENTER);
  };

  const selectSavedPlace = (place) => {
    if (!place?.coords) return;
    const lat = Number(place.coords[0]);
    const lng = Number(place.coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    handleLocationCoordsChange(savedMode, [lat, lng], place.name ?? formatLatLng([lat, lng]));
    setShowSavedModal(false);
  };

  const buildRouteRequest = () => {
    const originCoords = resolveCoords("origin", origin);
    const destinationCoords = resolveCoords("destination", destination);
    if (!originCoords || !destinationCoords) {
      return null;
    }
    return {
      originCoords,
      destinationCoords,
      origin: `${originCoords[0]},${originCoords[1]}`,
      destination: `${destinationCoords[0]},${destinationCoords[1]}`,
    };
  };

  const handlePreviewRoute = async () => {
    setError("");
    setHasPreview(false);
    setPolyline([]);
    const payload = buildRouteRequest();
    if (!payload) return;
    try {
      const preview = await previewRouteVm({
        origin: payload.origin,
        destination: payload.destination,
        mobilityType: mobility,
        routeType,
      });
      const normalizedLine = Array.isArray(preview?.polyline)
        ? preview.polyline
            .map((point) => {
              if (!Array.isArray(point) || point.length < 2) return null;
              const lat = Number(point[0]);
              const lng = Number(point[1]);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
              return [lat, lng];
            })
            .filter(Boolean)
        : [];
      if (normalizedLine.length < 2) {
        setError("No route could be calculated for the selected points.");
        return;
      }
      setPolyline(normalizedLine);
      const midPoint = normalizedLine[Math.floor(normalizedLine.length / 2)];
      if (Array.isArray(midPoint)) {
        setCenter([midPoint[0], midPoint[1]]);
      }
      setHasPreview(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to request route preview";
      setError(message);
    }
  };

  const handleSaveRoute = async () => {
    const payload = buildRouteRequest();
    if (!payload) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Route name is required to save.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await searchRoute({
        origin: payload.origin,
        destination: payload.destination,
        mobilityType: mobility,
        routeType,
        userId: user?.uid ?? undefined,
        name: trimmedName,
        save: true,
      });
      await CustomSwal.fire({
        title: "Route Saved",
        text: `"${trimmedName}" has been saved successfully.`,
        icon: "success",
        confirmButtonText: "Close",
      });
      setHasPreview(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save route";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (hasPreview) {
      await handleSaveRoute();
    } else {
      await handlePreviewRoute();
    }
  };

  useEffect(() => {
    setSelectedVehicle("");
  }, [mobility]);

  const combinedError = error || requestError;
  const primaryButtonLabel = hasPreview
    ? (loading || saving ? "Saving..." : "Save Route")
    : (loading ? "Previewing..." : "Preview Route");

  return (
    <section className="place-row">
      <aside className="place-card default-container with-border">
        <h2 className="card-title">Save Route</h2>

        <form onSubmit={handleFormSubmit} className="stack">
            <div className="form-row field-row">
            <label htmlFor="name">Name</label>
            <div className="input-with-btn">
              <input
                id="name"
                type="text"
                placeholder="Enter a route name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <LocationInput
            label="Origin"
            value={origin.value}
            onChange={(next) => handleLocationValueChange("origin", next)}
            onCoordsChange={(coords, label) => handleLocationCoordsChange("origin", coords, label)}
            onRequestSavedPlaces={() => openSavedModal("origin")}
            externalError={origin.error}
            placeholder="Enter a place or coordinates"
          />

          <LocationInput
            label="Destination"
            value={destination.value}
            onChange={(next) => handleLocationValueChange("destination", next)}
            onCoordsChange={(coords, label) => handleLocationCoordsChange("destination", coords, label)}
            onRequestSavedPlaces={() => openSavedModal("destination")}
            externalError={destination.error}
            placeholder="Enter a place or coordinates"
          />

          <div className="form-row">
            <label>Mobility method</label>
            <MobilitySelector value={mobility} onChange={(v) => { setMobility(v); invalidatePreview(); }} />

            <SelectVehicle
              mobility={mobility}
              value={selectedVehicle}
              onChange={(v) => { setSelectedVehicle(v); invalidatePreview(); }}
            />
          </div>

          <div className="form-row">
            <label htmlFor="routeType">Route type</label>
            <RouteTypeSelector id="routeType" value={routeType} onChange={(v) => { setRouteType(v); invalidatePreview(); }} />
          </div>

          <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.4rem" }}>
            <button type="submit" className="btn btn-primary" disabled={loading || saving}>
              {primaryButtonLabel}
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>

          {combinedError && <p className="error-text">{combinedError}</p>}
        </form>

        <SavedPlacesModal
          open={showSavedModal}
          onSelect={selectSavedPlace}
          onClose={closeSavedModal}
        />
      </aside>

      <main className="map-panel">
        <LeafletMap
          center={center}
          zoom={13}
          markers={markers}
          polyline={polyline}
          onMapClick={(coords) => {
            const [lat, lng] = coords;
            setError("");
            if (!origin.coords) {
              handleLocationCoordsChange("origin", [lat, lng], formatLatLng([lat, lng]));
            } else if (!destination.coords) {
              handleLocationCoordsChange("destination", [lat, lng], formatLatLng([lat, lng]));
            } else {
              handleLocationCoordsChange("origin", [lat, lng], formatLatLng([lat, lng]));
              mutateLocation("destination", () => createLocationState());
            }
          }}
          style={{ minHeight: 520 }} // opcional, control de tamaño desde aquí
        />
      </main>
    </section>
  );
}