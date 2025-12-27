import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RouteService } from "../../domain/service/RouteService";
import CustomSwal from "../../core/utils/CustomSwal";
import LeafletMap from "../components/LeafletMap";
import MobilitySelector from "../components/MobilitySelector";
import SelectVehicle from "../components/SelectVehicle";
import RouteTypeSelector from "../components/RouteTypeSelector";
import { useAuth } from "../../core/context/AuthContext";
import { useRouteViewmodel } from "../../viewmodel/routeViewmodel";
import { VehicleViewModel } from "../../viewmodel/VehicleViewModel";
const DEFAULT_CENTER = [39.99256, -0.067387];

const normalizeMobilityKey = (mode) => {
  if (mode === "bike") return "bike";
  if (mode === "walk") return "walk";
  return "vehicle";
};

const inferMobilityFromVehicle = (vehicle) => {
  const type = typeof vehicle?.type === "string" ? vehicle.type.toLowerCase() : "";
  if (type === "bike") return "bike";
  if (type === "walking") return "walk";
  return "vehicle";
};

const parseLatLng = (value) => {
  if (!value) return null;
  const parts = String(value)
    .split(",")
    .map((piece) => parseFloat(piece.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
  return [parts[0], parts[1]];
};

const formatDuration = (minutes) => {
  if (!Number.isFinite(minutes)) return "—";
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (!hrs) return `${mins} min`;
  if (!mins) return `${hrs} h`;
  return `${hrs} h ${mins} min`;
};

const formatDistance = (distance, unit = "m") => {
  if (!Number.isFinite(distance)) return "—";
  if (unit === "m" && distance >= 1000) {
    return `${(distance / 1000).toFixed(1)} km`;
  }
  return `${distance.toFixed(unit === "m" ? 0 : 2)} ${unit}`;
};

const formatCost = (amount, currency = "EUR") => {
  // console.log("formatCost", amount, currency);

  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

const formatConsumption = (value, unit) => {
  if (!Number.isFinite(value) || !unit) return "—";
  return `${value.toFixed(1)} ${unit}`;
};

const normalizeVehicleConsumption = (vehicle) => {
  if (!vehicle?.consumption) return null;
  const base = vehicle.consumption;
  const maybeAmount = base.amount.amount;
  //console.log("eooooo", base.amount.unit);
  if (typeof maybeAmount === "number") {
    return {
      value: maybeAmount,
      unit: (base.amount.unit ?? "").toLowerCase() || base.unit || null,
    };
  }
  if (maybeAmount && typeof maybeAmount.amount === "number") {
    const detectedUnit = maybeAmount.unit ?? base.unit;
    return {
      value: maybeAmount.amount,
      unit: (detectedUnit ?? "").toLowerCase() || detectedUnit || null,
    };
  }
  return null;
};

const formatVehicleConsumptionDisplay = (vehicle) => {
  const normalized = normalizeVehicleConsumption(vehicle);
  if (!normalized) return null;
  return formatConsumption(normalized.value, normalized.unit ?? undefined);
};

const computeVehicleCostDisplay = (vehicle, route, priceSnapshot) => {
  if (!vehicle || !route) return null;
  const normalized = normalizeVehicleConsumption(vehicle);
  if (!normalized) return null;

  const distanceKm = Number.isFinite(route.distance) ? route.distance : null;
  const durationMin = Number.isFinite(route.duration) ? route.duration : null;
  const unit = normalized.unit ?? "";
  const type = (vehicle.type ?? "").toLowerCase();

  console.log("eoooooooooo ", type);
  if ((type === "fuelcar" || type === "fuel car") && distanceKm != null && priceSnapshot) {
    //normalized value es el consumo en l/100km
    console.log("aqui", route.distance, normalized.value);
    const liters = (distanceKm / 100) * normalized.value;
    const fuelType = (vehicle.fuelType ?? "gasoline").toLowerCase();
    const dieselPrice = priceSnapshot.dieselPerLiter;
    console.log("diesel price", dieselPrice);
    const gasolinePrice = priceSnapshot.gasolinePerLiter;
    let fuelPrice;

    console.log("tioooo", fuelType);
    if (fuelType === "diesel") {
      // "??"" le dice que si por lo que sea es undefined use la otra
      fuelPrice = dieselPrice ?? gasolinePrice;
      console.log("dieseeel", fuelPrice);

    } else {
      fuelPrice = gasolinePrice ?? dieselPrice;
      console.log("gasofaa", fuelPrice);

    }
    console.log("fuel price", fuelPrice);
    const currency = priceSnapshot.currency ?? "EUR";
    console.log("currency", currency);
    console.log("liters", liters);
    console.log("fuelprice", fuelPrice);
    console.log("final", liters * fuelPrice);
    if (Number.isFinite(liters) && Number.isFinite(fuelPrice)) {
      return formatCost(liters * fuelPrice, currency);
    }
  }

  if ((type === "electriccar" || type === "electric car") && distanceKm != null && priceSnapshot) {
    if (!unit.includes("kwh")) return null;
    const kwh = (distanceKm / 100) * normalized.value;
    const pricePerKwh = priceSnapshot.electricityPerKwh;
    const currency = priceSnapshot.currency ?? "EUR";
    if (Number.isFinite(kwh) && Number.isFinite(pricePerKwh)) {
      return formatCost(kwh * pricePerKwh, currency);
    }
  }

  if ((type === "walking" || type === "bike" || type === "bicycle") && durationMin != null) {
    if (!unit.includes("kcal")) return null;
    const totalCalories = durationMin * normalized.value;
    if (Number.isFinite(totalCalories)) {
      return `${Math.round(totalCalories)} kcal`;
    }
  }

  return null;
};

export default function RouteDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loading: recalculatingRoute, searchRoute } = useRouteViewmodel();
  const vehicleViewmodel = VehicleViewModel();
  const routePlan = location.state?.routePlan;
  const searchMeta = location.state?.searchMeta;
  const [activePlan, setActivePlan] = useState(routePlan ?? null);
  useEffect(() => {
    setActivePlan(routePlan ?? null);
  }, [routePlan]);

  const route = activePlan?.route;
  const baseRoute = activePlan?.baseRoute;
  const priceSnapshot = activePlan?.priceSnapshot;
  const preferences = activePlan?.preferences;
  const resolvedMobility = route?.mobilityType ?? "vehicle";
  const resolvedRouteType = route?.routeType ?? "fastest";
  const [selectedMobility, setSelectedMobility] = useState(resolvedMobility);
  const [selectedRouteType, setSelectedRouteType] = useState(resolvedRouteType);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [rerouteError, setRerouteError] = useState(null);
  const latestRequestRef = useRef(0);

  const { vehicles } = vehicleViewmodel;

  useEffect(() => {
    setSelectedMobility(resolvedMobility);
    setSelectedRouteType(resolvedRouteType);
  }, [resolvedMobility, resolvedRouteType]);

  useEffect(() => {
    if (!activePlan) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activePlan]);

  useEffect(() => {
    setSelectedVehicleId("");
  }, [selectedMobility]);

  const vehicleOptions = useMemo(() => {
    if (!Array.isArray(vehicles)) return [];
    return vehicles.map((vehicle, index) => {
      const mobility = inferMobilityFromVehicle(vehicle);
      return {
        id: `${mobility}-${vehicle.name}-${index}`,
        name: vehicle.name,
        mobility,
        ref: vehicle,
      };
    });
  }, [vehicles]);

  const vehicleLookup = useMemo(() => {
    const map = new Map();
    vehicleOptions.forEach((option) => {
      map.set(option.id, option.ref);
    });
    return map;
  }, [vehicleOptions]);

  useEffect(() => {
    const isDefaultSelection = typeof selectedVehicleId === "string" && selectedVehicleId.startsWith("default-");
    if (selectedVehicleId && !isDefaultSelection && !vehicleLookup.has(selectedVehicleId)) {
      setSelectedVehicleId("");
    }
  }, [selectedVehicleId, vehicleLookup]);

  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return vehicleLookup.get(selectedVehicleId) ?? null;
  }, [selectedVehicleId, vehicleLookup]);

  const fetchVehiclesForMode = useCallback(
    async (mode) => {
      const normalized = normalizeMobilityKey(mode);
      return vehicleOptions
        .filter((option) => option.mobility === normalized)
        .map((option) => ({
          id: option.id,
          name: option.name,
          meta: formatVehicleConsumptionDisplay(option.ref) ?? undefined,
        }));
    },
    [vehicleOptions]
  );

  const originPoint = searchMeta?.origin;
  const destinationPoint = searchMeta?.destination;

  const triggerReroute = useCallback(
    async (mobilityValue, routeTypeValue, vehicleIdValue) => {
      if (!originPoint || !destinationPoint) return;
      const vehicle = vehicleIdValue ? vehicleLookup.get(vehicleIdValue) : undefined;
      const requestId = Date.now();
      latestRequestRef.current = requestId;
      setRerouteError(null);
      try {
        const response = await searchRoute({
          origin: originPoint,
          destination: destinationPoint,
          mobilityType: mobilityValue,
          routeType: routeTypeValue,
          userId: user?.uid,
          vehicle,
        });
        if (latestRequestRef.current === requestId) {
          setActivePlan(response);
        }
      } catch (error) {
        if (latestRequestRef.current === requestId) {
          const message = error instanceof Error ? error.message : "Unable to refresh route";
          setRerouteError(message);
        }
      }
    },
    [originPoint, destinationPoint, searchRoute, user?.uid, vehicleLookup]
  );
  const resolvedConsumptionDisplay = useMemo(() => {
    if (selectedVehicle) {
      const vehicleConsumption = formatVehicleConsumptionDisplay(selectedVehicle);
      if (vehicleConsumption) return vehicleConsumption;
    }
    return formatConsumption(route?.consumptionPer100Km, route?.consumptionUnit);
  }, [route?.consumptionPer100Km, route?.consumptionUnit, selectedVehicle]);

  const resolvedCostDisplay = useMemo(() => {
    const vehicleEstimate = computeVehicleCostDisplay(selectedVehicle, route, priceSnapshot);
    if (vehicleEstimate) return vehicleEstimate;
    return formatCost(route?.cost, route?.currency);
  }, [priceSnapshot, route, selectedVehicle]);

  const handleMobilityChange = useCallback(
    (nextMobility) => {
      if (nextMobility === selectedMobility) return;
      setSelectedMobility(nextMobility);
      setSelectedVehicleId("");
      triggerReroute(nextMobility, selectedRouteType, "");
    },
    [selectedMobility, selectedRouteType, triggerReroute]
  );

  const handleRouteTypeChange = useCallback(
    (nextRouteType) => {
      if (nextRouteType === selectedRouteType) return;
      setSelectedRouteType(nextRouteType);
      triggerReroute(selectedMobility, nextRouteType, selectedVehicleId);
    },
    [selectedRouteType, selectedMobility, selectedVehicleId, triggerReroute]
  );

  const handleVehicleChange = useCallback(
    (nextVehicleId) => {
      if (nextVehicleId === selectedVehicleId) return;
      setSelectedVehicleId(nextVehicleId);
      triggerReroute(selectedMobility, selectedRouteType, nextVehicleId);
    },
    [selectedVehicleId, selectedMobility, selectedRouteType, triggerReroute]
  );

  const routePolyline = useMemo(() => {
    if (!Array.isArray(route?.polyline)) return [];
    return route.polyline
      .map((point) => {
        if (!Array.isArray(point) || point.length < 2) return null;
        const lat = Number(point[0]);
        const lng = Number(point[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng];
      })
      .filter(Boolean);
  }, [route]);

  const fallbackMarkers = useMemo(() => {
    const markers = [];
    const origin = Array.isArray(searchMeta?.originCoords)
      ? searchMeta.originCoords
      : parseLatLng(searchMeta?.origin);
    const destination = Array.isArray(searchMeta?.destinationCoords)
      ? searchMeta.destinationCoords
      : parseLatLng(searchMeta?.destination);
    if (origin) markers.push(origin);
    if (destination) markers.push(destination);
    return markers;
  }, [searchMeta]);

  const resolvedOriginLabel = searchMeta?.originLabel ?? searchMeta?.origin ?? "—";
  const resolvedDestinationLabel = searchMeta?.destinationLabel ?? searchMeta?.destination ?? "—";

  const markers = useMemo(() => {
    if (routePolyline.length >= 2) {
      return [routePolyline[0], routePolyline[routePolyline.length - 1]];
    }
    return fallbackMarkers;
  }, [routePolyline, fallbackMarkers]);

  const mapPolyline = useMemo(() => {
    return routePolyline.length >= 2 ? routePolyline : [];
  }, [routePolyline]);

  const mapCenter = useMemo(() => {
    if (mapPolyline.length >= 2) {
      const mid = mapPolyline[Math.floor(mapPolyline.length / 2)];
      return [mid[0], mid[1]];
    }
    return markers[0] ?? DEFAULT_CENTER;
  }, [mapPolyline, markers]);

  if (!activePlan) {
    return (
      <section className="place-row">
        <aside className="place-card default-container with-border">
          <h2 className="card-title">Route details unavailable</h2>
          <p>Plan una ruta primero para ver sus detalles.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/searchroute", { replace: true })}>
            Volver a buscar
          </button>
        </aside>
      </section>
    );
  }

  const steps = Array.isArray(route?.steps) ? route.steps : [];

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleSaveRoute = useCallback(
    async (routeName) => {
      if (!routePlan) return;
      const originStr = searchMeta?.origin ?? (markers[0] ? `${markers[0][0]},${markers[0][1]}` : "");
      const destinationStr = searchMeta?.destination ?? (markers[1] ? `${markers[1][0]},${markers[1][1]}` : "");
      if (!originStr || !destinationStr) {
        setSaveError("Missing origin/destination to save this route.");
        return;
      }
      const trimmedName = routeName?.trim();
      if (!trimmedName) {
        setSaveError("Route name is required to save.");
        return;
      }
      const nameOrigin = (searchMeta?.label || resolvedOriginLabel || "Route").toString();
      const nameDestination = (searchMeta?.label || resolvedDestinationLabel || "Route").toString();
      const finalName = trimmedName || `${nameOrigin} to ${nameDestination}`;
      setSaving(true);
      setSaveError(null);
      try {
        await RouteService.getInstance().saveRoute({
          origin: originStr,
          destination: destinationStr,
          mobilityType: route?.mobilityType ?? "vehicle",
          routeType: route?.routeType ?? "fastest",
          name: finalName,
          userId: searchMeta?.userId,
        });
        await CustomSwal.fire({
          title: "Saved Route",
          text: `"${finalName}" was saved successfully.`,
          icon: "success",
          confirmButtonText: "Close",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to save route";
        setSaveError(message);
      } finally {
        setSaving(false);
      }
    },
    [routePlan, searchMeta, markers, resolvedDestinationLabel, resolvedOriginLabel, route?.mobilityType, route?.routeType]
  );

  const handlePromptAndSave = useCallback(async () => {
    const { value, isConfirmed } = await CustomSwal.fire({
      title: "Save Route",
      input: "text",
      inputLabel: "Route name",
      inputPlaceholder: "E.g. Home to Work",
      inputValue: searchMeta?.label ?? "",
      showCancelButton: true,
      confirmButtonText: "Save Route",
      cancelButtonText: "Cancel",
      preConfirm: (val) => {
        const trimmed = typeof val === "string" ? val.trim() : "";
        if (!trimmed) {
          CustomSwal.showValidationMessage("Route name is required");
          return false;
        }
        return trimmed;
      },
    });

    if (!isConfirmed) return;
    const selectedName = typeof value === "string" ? value.trim() : "";
    await handleSaveRoute(selectedName || undefined);
  }, [handleSaveRoute, searchMeta]);

  return (
    <section className="place-row">
      <aside className="place-card default-container with-border">
        <h2 className="card-title">
          Route details {searchMeta?.label ? <span>· {searchMeta.label}</span> : null}
        </h2>
        <div className="stack" style={{ marginTop: "1.5rem" }}>
          <p>
            <strong>Origin:</strong> {resolvedOriginLabel}
            {searchMeta?.origin ? <span> - ({searchMeta.origin})</span> : null}
          </p>
          <p>
            <strong>Destination:</strong> {resolvedDestinationLabel}
            {searchMeta?.destination ? <span> - ({searchMeta.destination})</span> : null}
          </p>
        </div>

        <div className="stats-grid">
          <div>
            <strong>Distance: </strong>
            <p className="value">{formatDistance(route?.distance, route?.distanceUnit)}</p>
          </div>
          <div>
            <strong>Duration: </strong>
            <p className="value">{formatDuration(route?.duration)}</p>
          </div>
          <div>
            <strong>Estimated cost: </strong>
            <p className="value">{resolvedCostDisplay}</p>
          </div>
          <div>
            <strong>Consumption: </strong>
            <p className="value">{resolvedConsumptionDisplay}</p>
          </div>
        </div>


        <div className="stack" style={{ marginBottom: "1.5rem" }}>
          <div className="form-row">
            <label htmlFor="name">Mobility method</label>
            <MobilitySelector value={selectedMobility} onChange={handleMobilityChange} />
          </div>
          <SelectVehicle
            mobility={selectedMobility}
            value={selectedVehicleId}
            onChange={handleVehicleChange} //handleVehicleChange revisar con el select
            
            fetchVehicles={fetchVehiclesForMode}
          />
          <div className="form-row">
            <label htmlFor="routeTypeDetails">Route type</label>
            <RouteTypeSelector
              id="routeTypeDetails"
              value={selectedRouteType}
              onChange={handleRouteTypeChange}
            />
          </div>
          {recalculatingRoute && <p className="label">Refreshing route…</p>}
          {rerouteError && <p className="error-text">{rerouteError}</p>}
        </div>

        <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.25rem" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePromptAndSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Route"}
          </button>

          <button type="button" className="btn" onClick={() => navigate("/searchroute")}>
            Search another route
          </button>
        </div>

        {saveError && <p className="error-text" style={{ marginTop: "0.75rem" }}>{saveError}</p>}
      </aside>

      <main className="map-panel">
        <LeafletMap
          center={mapCenter}
          zoom={13}
          markers={markers}
          polyline={mapPolyline}
          autoFitBounds={markers.length >= 2}
          highlightDestination
          style={{ minHeight: 360 }}
        />

        <div className="default-container with-border" style={{ marginTop: "1rem" }}>
          <h3>Turn-by-turn instructions</h3>
          {steps.length ? (
            <ol className="stack" style={{ marginTop: "0.75rem" }}>
              {steps.map((step, index) => (
                <li key={`${index}-${step?.slice?.(0, 10) ?? index}`}>{step}</li>
              ))}
            </ol>
          ) : (
            <p>No instructions provided for this route.</p>
          )}
        </div>
      </main>
    </section>
  );
}
