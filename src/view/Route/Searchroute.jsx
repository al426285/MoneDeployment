import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../core/context/AuthContext";
import { useRouteViewmodel } from "../../viewmodel/routeViewmodel";
import { placeViewmodel } from "../../viewmodel/placeViewmodel";
import LeafletMap from "../components/LeafletMap";
import LocationInput from "../components/LocationInput";
import SavedPlacesModal from "../components/SavedPlacesModal";
import MobilitySelector from "../components/MobilitySelector";
import RouteTypeSelector from "../components/RouteTypeSelector";
import {
    getUserDefaultOptions,
} from "../../viewmodel/UserViewModel";

const DEFAULT_CENTER = [39.99256, -0.067387];

const createLocationState = () => ({
  value: "",
  coords: null,
  error: "",
  autoPickSuggestion: false,
});

const formatLatLng = ([lat, lng]) => `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;

const parseCoordsFromString = (value) => {
  if (!value) return null;
  const parts = value.split(",").map((piece) => parseFloat(piece.trim()));
  if (parts.length !== 2) return null;
  const [lat, lng] = parts;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
};

export default function SearchRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loading, error: requestError, searchRoute } = useRouteViewmodel();

const [prefs] = useState(null);
  useEffect(() => {
    const loadPrefs = async () => {
    const data = await getUserDefaultOptions();
    setMobility(data?.transportMode ?? "vehicle");
    setRouteType(data?.routeType ?? "fastest");
  };
  loadPrefs();
  }, []);
  const [mobility, setMobility] = useState(prefs?.transportMode ?? "vehicle"); //aqui inicial
  const [routeType, setRouteType] = useState(prefs?.routeType ?? "fastest");
  const [origin, setOrigin] = useState(() => createLocationState());
  const [destination, setDestination] = useState(() => createLocationState());
  const [polyline, setPolyline] = useState([]);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [localError, setLocalError] = useState("");
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [activeSavedField, setActiveSavedField] = useState("origin");

  const mutateLocation = useCallback((key, updater) => {
    if (key === "origin") {
      setOrigin((prev) => updater(prev));
    } else {
      setDestination((prev) => updater(prev));
    }
  }, []);

  const handleLocationValueChange = useCallback(
    (key, nextValue) => {
      setLocalError("");
      setPolyline([]);
      const parsed = parseCoordsFromString(nextValue);
      mutateLocation(key, () => ({
        value: nextValue,
        coords: parsed,
        error: "",
        autoPickSuggestion: false,
      }));
    },
    [mutateLocation]
  );

  const handleLocationCoordsChange = useCallback(
    (key, coords, label, options = {}) => {
      const { autoPickSuggestion = false } = options;
      if (!coords) {
        mutateLocation(key, (prev) => ({ ...prev, coords: null, autoPickSuggestion: false }));
        return;
      }
      const [lat, lng] = coords;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      mutateLocation(key, (prev) => ({
        ...prev,
        value: label ?? formatLatLng([lat, lng]),
        coords: [lat, lng],
        error: "",
        autoPickSuggestion,
      }));
    },
    [mutateLocation]
  );

  const fetchToponymForCoords = useCallback(
    async (key, coords) => {
      if (!Array.isArray(coords)) return;
      const [lat, lng] = coords;
      try {
        const suggestion = await placeViewmodel.toponymFromCoords(lat, lng);
        if (suggestion?.label) {
          mutateLocation(key, (prev) => {
            if (!prev.coords) return prev;
            if (prev.coords[0] !== lat || prev.coords[1] !== lng) return prev;
            if (!prev.autoPickSuggestion) return prev;
            return { ...prev, value: suggestion.label };
          });
        }
      } catch (error) {
        console.warn("SearchRoute: unable to resolve toponym", error);
      }
    },
    [mutateLocation]
  );

  const ensureCoordsAvailable = useCallback(
    (key, state) => {
      if (state.coords) return state.coords;
      const parsed = parseCoordsFromString(state.value);
      if (parsed) {
        handleLocationCoordsChange(key, parsed, formatLatLng(parsed));
        return parsed;
      }
      mutateLocation(key, (prev) => ({
        ...prev,
        error: "Introduce coordenadas válidas o selecciona un topónimo.",
        autoPickSuggestion: false,
      }));
      return null;
    },
    [handleLocationCoordsChange, mutateLocation]
  );

  const openSavedModal = (field) => {
    setActiveSavedField(field);
    setShowSavedModal(true);
  };

  const closeSavedModal = () => setShowSavedModal(false);

  const selectSavedPlace = useCallback(
    (place) => {
      if (!place?.coords) return;
      const lat = Number(place.coords[0]);
      const lng = Number(place.coords[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setPolyline([]);
      handleLocationCoordsChange(activeSavedField, [lat, lng], place.name ?? formatLatLng([lat, lng]));
      fetchToponymForCoords(activeSavedField, [lat, lng]);
    },
    [activeSavedField, handleLocationCoordsChange, fetchToponymForCoords]
  );

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
    if (markers.length === 2) {
      const a = markers[0].coords ?? markers[0];
      const b = markers[1].coords ?? markers[1];
      setCenter([
        (a[0] + b[0]) / 2,
        (a[1] + b[1]) / 2,
      ]);
      return;
    }
    if (markers.length === 1) {
      const only = markers[0].coords ?? markers[0];
      setCenter(only);
      return;
    }
    setCenter(DEFAULT_CENTER);
  }, [markers, polyline]);

  const handleMapClick = useCallback(
    (coords) => {
      const [lat, lng] = coords;
      setLocalError("");
      setPolyline([]);
      let target = "origin";
      if (!origin.coords) {
        target = "origin";
      } else if (!destination.coords) {
        target = "destination";
      } else {
        target = "origin";
        mutateLocation("destination", () => createLocationState());
      }
      handleLocationCoordsChange(target, [lat, lng], formatLatLng([lat, lng]), { autoPickSuggestion: true });
      fetchToponymForCoords(target, [lat, lng]);
    },
    [origin.coords, destination.coords, handleLocationCoordsChange, fetchToponymForCoords, mutateLocation]
  );

  const acknowledgeAutoPick = useCallback(
    (key) => {
      mutateLocation(key, (prev) => (prev.autoPickSuggestion ? { ...prev, autoPickSuggestion: false } : prev));
    },
    [mutateLocation]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");

    const originCoords = ensureCoordsAvailable("origin", origin);
    const destinationCoords = ensureCoordsAvailable("destination", destination);
    if (!originCoords || !destinationCoords) {
      return;
    }

    const normalizedOrigin = `${originCoords[0]},${originCoords[1]}`;
    const normalizedDestination = `${destinationCoords[0]},${destinationCoords[1]}`;
    const originLabel = origin.value?.trim() || formatLatLng(originCoords);
    const destinationLabel = destination.value?.trim() || formatLatLng(destinationCoords);
    setPolyline([]);

    try {
      const response = await searchRoute({
        origin: normalizedOrigin,
        destination: normalizedDestination,
        mobilityType: mobility,
        routeType,
        userId: user?.uid,
      });

      const resolvedPolyline = Array.isArray(response?.route?.polyline) ? response.route.polyline : null;
      if (resolvedPolyline?.length >= 2) {
        const normalizedLine = resolvedPolyline
          .map((point) => {
            if (!Array.isArray(point) || point.length < 2) return null;
            const lat = Number(point[0]);
            const lng = Number(point[1]);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return [lat, lng];
          })
          .filter(Boolean);
        if (normalizedLine.length >= 2) {
          setPolyline(normalizedLine);
        }
      }

      navigate("/routedetails", {
        state: {
          routePlan: response,
          searchMeta: {
            origin: normalizedOrigin,
            destination: normalizedDestination,
            originLabel,
            destinationLabel,
            originCoords,
            destinationCoords,
          },
        },
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Error calculando la ruta");
    }
  };

  const handleReset = () => {
    setOrigin(createLocationState());
    setDestination(createLocationState());
    setPolyline([]);
    setCenter(DEFAULT_CENTER);
    setLocalError("");
  };

  const combinedError = localError || requestError;

  const renderLocationField = (key, label, state) => (
    <LocationInput
      label={label}
      value={state.value}
      onChange={(next) => handleLocationValueChange(key, next)}
      onCoordsChange={(coords, resolvedLabel) => handleLocationCoordsChange(key, coords, resolvedLabel)}
      onRequestSavedPlaces={() => openSavedModal(key)}
      externalError={state.error}
      autoPickFirstSuggestion={state.autoPickSuggestion}
      onAutoPickComplete={() => acknowledgeAutoPick(key)}
      autoPickSourceCoords={state.coords}
    />
  );

  return (
    <section className="place-row">
      <aside className="place-card default-container with-border">
        <h2 className="card-title">Search Route</h2>

        <form onSubmit={handleSubmit} className="stack">
          {renderLocationField("origin", "Origin", origin)}
          {renderLocationField("destination", "Destination", destination)}

          <div className="form-row">
            <label>Mobility method</label>
            <MobilitySelector value={mobility} onChange={setMobility} />
          </div>

          <div className="form-row">
            <label htmlFor="routeType">Route type</label>
            <RouteTypeSelector id="routeType" value={routeType} onChange={setRouteType} />
          </div>

          <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.4rem" }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Searching..." : "Find Route"}
            </button>
            <button type="button" className="btn" onClick={handleReset}>
              Reset
            </button>
          </div>

          {combinedError && <p className="error-text">{combinedError}</p>}
        </form>

        <SavedPlacesModal open={showSavedModal} onSelect={selectSavedPlace} onClose={closeSavedModal} />
      </aside>

      <main className="map-panel">
        <LeafletMap
          center={center}
          zoom={13}
          markers={markers}
          polyline={polyline}
          onMapClick={handleMapClick}
          style={{ minHeight: 520 }}
        />
      </main>
    </section>
  );
}