import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RouteService } from "../../domain/service/RouteService";
import CustomSwal from "../../core/utils/CustomSwal";
import LeafletMap from "../components/LeafletMap";

const DEFAULT_CENTER = [39.99256, -0.067387];

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

export default function RouteDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const routePlan = location.state?.routePlan;
  const searchMeta = location.state?.searchMeta;
  const route = routePlan?.route;
  const baseRoute = routePlan?.baseRoute;
  const priceSnapshot = routePlan?.priceSnapshot;
  const preferences = routePlan?.preferences;

  useEffect(() => {
    if (!routePlan) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [routePlan]);

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
    if (routePolyline.length >= 2) return routePolyline;
    return markers.length === 2 ? markers : [];
  }, [routePolyline, markers]);

  const mapCenter = useMemo(() => {
    if (mapPolyline.length >= 2) {
      const mid = mapPolyline[Math.floor(mapPolyline.length / 2)];
      return [mid[0], mid[1]];
    }
    return markers[0] ?? DEFAULT_CENTER;
  }, [mapPolyline, markers]);

  if (!routePlan) {
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

        <div className="stats-grid">
          <div>
            <p className="label">Distance</p>
            <p className="value">{formatDistance(route?.distance, route?.distanceUnit)}</p>
          </div>
          <div>
            <p className="label">Duration</p>
            <p className="value">{formatDuration(route?.duration)}</p>
          </div>
          <div>
            <p className="label">Estimated cost</p>
            <p className="value">{formatCost(route?.cost, route?.currency)}</p>
          </div>
          <div>
            <p className="label">Consumption</p>
            <p className="value">{formatConsumption(route?.consumptionPer100Km, route?.consumptionUnit)}</p>
          </div>
        </div>

        <div className="stack" style={{ marginTop: "1.5rem" }}>
          <h3>Route endpoints</h3>
          <p>
            <strong>Origin:</strong> {resolvedOriginLabel}
            {searchMeta?.origin ? <span> · {searchMeta.origin}</span> : null}
          </p>
          <p>
            <strong>Destination:</strong> {resolvedDestinationLabel}
            {searchMeta?.destination ? <span> · {searchMeta.destination}</span> : null}
          </p>
        </div>

        <div className="stack" style={{ marginTop: "1.5rem" }}>
          <h3>Preferences applied</h3>
          <ul>
            <li>Distance unit: {preferences?.distanceUnit ?? "km"}</li>
            <li>Combustion consumption: {preferences?.combustionConsumptionUnit ?? "l/100km"}</li>
            <li>Electric consumption: {preferences?.electricConsumptionUnit ?? "kwh/100km"}</li>
          </ul>
        </div>

        {priceSnapshot && (
          <div className="stack" style={{ marginTop: "1rem" }}>
            <h3>Energy prices snapshot</h3>
            <p>
              Updated: {priceSnapshot.timestamp ? new Date(priceSnapshot.timestamp).toLocaleString() : "—"} ({priceSnapshot.currency ?? "EUR"})
            </p>
            <p>Gasoline: {priceSnapshot.gasolinePerLiter ?? "—"} €/L · Diesel: {priceSnapshot.dieselPerLiter ?? "—"} €/L</p>
            <p>Electricity: {priceSnapshot.electricityPerKwh ?? "—"} €/kWh</p>
          </div>
        )}

        <div className="stack" style={{ marginTop: "1rem" }}>
          <h3>Planner baseline</h3>
          <p>
            Distance: {baseRoute ? formatDistance(baseRoute.distance, baseRoute.distanceUnit) : "—"} · Cost: {baseRoute ? formatCost(baseRoute.cost, baseRoute.currency) : "—"}
          </p>
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
          autoFitBounds={mapPolyline.length >= 2}
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
