import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { RouteService } from "../../domain/service/RouteService";
import CustomSwal from "../../core/utils/CustomSwal";
import LeafletMap from "../components/LeafletMap";
import MobilitySelector from "../components/MobilitySelector";
import SelectVehicle from "../components/SelectVehicle";
import RouteTypeSelector from "../components/RouteTypeSelector";
import { useAuth } from "../../core/context/AuthContext";
import { useRouteViewmodel } from "../../viewmodel/routeViewmodel";
import { VehicleViewModel } from "../../viewmodel/VehicleViewModel";
import { placeViewmodel } from "../../viewmodel/placeViewmodel";
import BackButton from "../components/BackButton";
import {
    getUserDefaultOptions,
} from "../../viewmodel/UserViewModel";
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

const toRadians = (deg) => (deg * Math.PI) / 180;
const distanceMeters = (a, b) => {
  if (!a || !b) return Infinity;
  const R = 6371000;
  const dLat = toRadians(b[0] - a[0]);
  const dLon = toRadians(b[1] - a[1]);
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const normalizePlaceRecord = (place) => {
  if (!place) return null;
  const coordsCandidate = Array.isArray(place.coords)
    ? place.coords
    : Array.isArray(place.latitude)
      ? place.latitude
      : [Number(place.latitude ?? place.lat ?? place.latitude), Number(place.longitude ?? place.lng ?? place.longitude)];
  const lat = Number(coordsCandidate?.[0]);
  const lng = Number(coordsCandidate?.[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const label = place.name || place.label || place.toponymicAddress || undefined;
  return { ...place, coords: [lat, lng], label };
};

const findNearestPlaceLabel = (coords, places, maxMeters = 75) => {
  if (!Array.isArray(places)) return null;
  let best = null;
  for (const p of places) {
    if (!Array.isArray(p?.coords)) continue;
    const dist = distanceMeters(coords, p.coords);
    if (dist <= maxMeters) {
      best = p.label || p.name || p.toponymicAddress;
      break;
    }
  }
  return best;
};

const LABEL_CACHE_KEY = "mone.route.toponyms";

const readLabelCache = () => {
  try {
    const raw = localStorage.getItem(LABEL_CACHE_KEY);
    if (!raw) return { coords: {}, routes: {} };
    const parsed = JSON.parse(raw);
    return {
      coords: parsed?.coords && typeof parsed.coords === "object" ? parsed.coords : {},
      routes: parsed?.routes && typeof parsed.routes === "object" ? parsed.routes : {},
    };
  } catch {
    return { coords: {}, routes: {} };
  }
};

const persistLabelCache = (cache) => {
  try {
    localStorage.setItem(LABEL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore storage failures */
  }
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

  if ((type === "fuelcar" || type === "fuel car") && distanceKm != null && priceSnapshot) {
    //normalized value es el consumo en l/100km
    const liters = (distanceKm / 100) * normalized.value;
    const fuelType = (vehicle.fuelType ?? "gasoline").toLowerCase();
    const dieselPrice = priceSnapshot.dieselPerLiter;
    const gasolinePrice = priceSnapshot.gasolinePerLiter;
    let fuelPrice;

    if (fuelType === "diesel") {
      // "??"" le dice que si por lo que sea es undefined use la otra
      fuelPrice = dieselPrice ?? gasolinePrice;

    } else {
      fuelPrice = gasolinePrice ?? dieselPrice;

    }
    const currency = priceSnapshot.currency ?? "EUR";
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
  const { routeId } = useParams();
  const { user } = useAuth();
  const { loading: recalculatingRoute, searchRoute, getSavedRoute } = useRouteViewmodel();
  const vehicleViewmodel = VehicleViewModel();

  const savedRouteFromState = location.state?.savedRoute;
  const initialRoutePlan = location.state?.routePlan;
  const initialSearchMeta = location.state?.searchMeta;
  const [savedVehicleSnapshot, setSavedVehicleSnapshot] = useState(savedRouteFromState?.vehicle ?? null);
  const savedVehicleMobility = useMemo(
    () => (savedVehicleSnapshot ? normalizeMobilityKey(inferMobilityFromVehicle(savedVehicleSnapshot)) : null),
    [savedVehicleSnapshot]
  );

  const [activePlan, setActivePlan] = useState(initialRoutePlan ?? null);
  const [searchMeta, setSearchMeta] = useState(initialSearchMeta ?? null);
  const [loadingSavedRoute, setLoadingSavedRoute] = useState(false);
  const [savedRouteError, setSavedRouteError] = useState("");
  const isSavedRouteDetail = Boolean(routeId);
  const savedRouteCandidate = routeId && savedRouteFromState && savedRouteFromState.id === routeId ? savedRouteFromState : null;

  useEffect(() => {
    setActivePlan(initialRoutePlan ?? null);
    setSearchMeta(initialSearchMeta ?? null);
  }, [initialRoutePlan, initialSearchMeta]);

  const route = activePlan?.route;
  const baseRoute = activePlan?.baseRoute;
  const priceSnapshot = activePlan?.priceSnapshot;
  const preferences = activePlan?.preferences;
  const [defaultVehicleName, setDefaultVehicleName] = useState("");
  useEffect(() => {
    const loadPrefs = async () => {
      const data = await getUserDefaultOptions();
      setDefaultVehicleName(data?.vehicleName ?? ""); //solo nos interesa el vehiculo y no el tipo de movilidad o el tipo de ruta porque estas dos se arrastran de la pantalla Explore
    };
    loadPrefs();
  }, []);

  const resolvedMobility = route?.mobilityType ?? "vehicle";
  const resolvedRouteType = route?.routeType ?? "fastest";
  const [selectedMobility, setSelectedMobility] = useState(resolvedMobility);
  const [selectedRouteType, setSelectedRouteType] = useState(resolvedRouteType);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [rerouteError, setRerouteError] = useState(null);
  const latestRequestRef = useRef(0);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [locationLabels, setLocationLabels] = useState({ origin: null, destination: null });
  const labelCacheRef = useRef(readLabelCache());

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
    let cancelled = false;
    (async () => {
      try {
        const results = await placeViewmodel.getPlaces();
        if (cancelled) return;
        const normalized = Array.isArray(results)
          ? results.map((p) => normalizePlaceRecord(p)).filter(Boolean)
          : [];
        setSavedPlaces(normalized);
      } catch {
        if (!cancelled) setSavedPlaces([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelectedVehicleId("");
  }, [selectedMobility]);

  const resolveLocationLabel = useCallback(
    async (raw, routeId, field) => {
      if (!raw) return null;
      const coords = parseLatLng(raw);
      if (!coords) return raw;

      const routeCache = labelCacheRef.current.routes?.[routeId]?.[field];
      if (routeCache) return routeCache;

      const cacheKey = `${coords[0].toFixed(5)},${coords[1].toFixed(5)}`;
      const cached = labelCacheRef.current.coords?.[cacheKey];
      if (cached) return cached;

      const savedLabel = findNearestPlaceLabel(coords, savedPlaces);
      if (savedLabel) {
        const next = { ...labelCacheRef.current };
        next.coords = { ...next.coords, [cacheKey]: savedLabel };
        if (routeId) {
          next.routes = {
            ...next.routes,
            [routeId]: { ...(next.routes?.[routeId] || {}), [field]: savedLabel },
          };
        }
        labelCacheRef.current = next;
        persistLabelCache(next);
        return savedLabel;
      }

      try {
        const suggestion = await placeViewmodel.toponymFromCoords(coords[0], coords[1]);
        const label = suggestion?.label || raw;
        const next = { ...labelCacheRef.current };
        next.coords = { ...next.coords, [cacheKey]: label };
        if (routeId) {
          next.routes = {
            ...next.routes,
            [routeId]: { ...(next.routes?.[routeId] || {}), [field]: label },
          };
        }
        labelCacheRef.current = next;
        persistLabelCache(next);
        return label;
      } catch {
        return raw;
      }
    },
    [savedPlaces]
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const originLabel = await resolveLocationLabel(searchMeta?.origin, routeId || "", "origin");
      const destinationLabel = await resolveLocationLabel(searchMeta?.destination, routeId || "", "destination");
      if (cancelled) return;
      setLocationLabels({ origin: originLabel, destination: destinationLabel });
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [searchMeta?.origin, searchMeta?.destination, resolveLocationLabel]);

  const goBackToList = useCallback(() => {
    try {
      if (window.history && window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/routes");
      }
    } catch (error) {
      navigate("/routes");
    }
  }, [navigate]);

  const fetchSavedRoutePlan = useCallback(async () => {
    if (!routeId || activePlan) return;
    setLoadingSavedRoute(true);
    setSavedRouteError("");
    try {
      let savedRoute = savedRouteCandidate;
      if (!savedRoute || !savedRoute.vehicle) {
        savedRoute = await getSavedRoute(routeId, user?.uid);
      }
      if (!savedRoute) {
        throw new Error("Saved route not found");
      }

      if (savedRoute.vehicle) {
        setSavedVehicleSnapshot(savedRoute.vehicle);
      }

      const normalizedMobility = savedRoute.mobilityType || savedRoute.mobilityMethod || "vehicle";
      const normalizedRouteType = savedRoute.routeType || "fastest";

      const response = await searchRoute({
        origin: savedRoute.origin,
        destination: savedRoute.destination,
        mobilityType: normalizedMobility,
        routeType: normalizedRouteType,
        userId: user?.uid,
        name: savedRoute.name,
        vehicle: savedRoute.vehicle ?? undefined,
      });

      setActivePlan(response);
      setSearchMeta({
        label: savedRoute.name,
        origin: savedRoute.origin,
        destination: savedRoute.destination,
        originLabel: savedRoute.origin,
        destinationLabel: savedRoute.destination,
        originCoords: parseLatLng(savedRoute.origin) ?? undefined,
        destinationCoords: parseLatLng(savedRoute.destination) ?? undefined,
        userId: user?.uid,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load saved route";
      setSavedRouteError(message);
    } finally {
      setLoadingSavedRoute(false);
    }
  }, [routeId, activePlan, savedRouteCandidate, getSavedRoute, searchRoute, user?.uid]);

  useEffect(() => {
    if (!isSavedRouteDetail) return;
    if (activePlan) return;
    fetchSavedRoutePlan();
  }, [isSavedRouteDetail, activePlan, fetchSavedRoutePlan]);

  const vehicleOptions = useMemo(() => {
    if (!Array.isArray(vehicles)) return [];
    return vehicles.map((vehicle, index) => {
      const mobility = inferMobilityFromVehicle(vehicle);
      return {
        id: `${mobility}-${vehicle.name}-${index}`,
        name: vehicle.name,
        mobility,
        favorite: Boolean(vehicle?.favorite),
        ref: vehicle,
      };
    });
  }, [vehicles]);

  const savedVehicleOption = useMemo(() => {
    if (!savedVehicleSnapshot || !savedVehicleMobility) return null;
    const existing = vehicleOptions.find((opt) => opt.name === savedVehicleSnapshot.name || opt.ref?.name === savedVehicleSnapshot.name);
    if (existing) return existing;
    return {
      id: `saved-${savedVehicleMobility}-${savedVehicleSnapshot.name || "vehicle"}`,
      name: savedVehicleSnapshot.name || "Saved vehicle",
      mobility: savedVehicleMobility,
      favorite: Boolean(savedVehicleSnapshot.favorite),
      ref: savedVehicleSnapshot,
    };
  }, [savedVehicleSnapshot, savedVehicleMobility, vehicleOptions]);

  const vehicleLookup = useMemo(() => {
    const map = new Map();
    vehicleOptions.forEach((option) => {
      map.set(option.id, option.ref);
    });
    if (savedVehicleOption) {
      map.set(savedVehicleOption.id, savedVehicleOption.ref);
    }
    return map;
  }, [vehicleOptions, savedVehicleOption]);

  // Try to preselect the vehicle saved with the route by matching its name
  useEffect(() => {
    if (!savedVehicleSnapshot || !savedVehicleMobility) return;
    const match = vehicleOptions.find(
      (option) => option.name === savedVehicleSnapshot.name || option.ref?.name === savedVehicleSnapshot.name
    );
    const targetId = match ? match.id : savedVehicleOption?.id;
    if (targetId) {
      setSelectedVehicleId((prev) => (prev ? prev : targetId));
    }
  }, [savedVehicleSnapshot, savedVehicleMobility, vehicleOptions, savedVehicleOption]);

  useEffect(() => {
    if (!defaultVehicleName) return;
    const match = vehicleOptions.find(
      (option) => option.name === defaultVehicleName && option.mobility === resolvedMobility
    );
    if (match && match.id !== selectedVehicleId) {
      setSelectedVehicleId(match.id);
    }
  }, [defaultVehicleName, vehicleOptions, resolvedMobility]);

  useEffect(() => {
    const isDefaultSelection = typeof selectedVehicleId === "string" && selectedVehicleId.startsWith("default-");
    if (selectedVehicleId && !isDefaultSelection && !vehicleLookup.has(selectedVehicleId)) {
      setSelectedVehicleId("");
    }
  }, [selectedVehicleId, vehicleLookup]);

  const selectedVehicle = useMemo(() => {
    if (selectedVehicleId) {
      const found = vehicleLookup.get(selectedVehicleId);
      if (found) return found;
    }
    // Fallback to the vehicle stored with the saved route (snapshot)
    if (savedVehicleSnapshot) return savedVehicleSnapshot;
    return null;
  }, [selectedVehicleId, vehicleLookup, savedVehicleSnapshot]);

  const fetchVehiclesForMode = useCallback(
    async (mode) => {
      const normalized = normalizeMobilityKey(mode);
      const base = vehicleOptions.filter((option) => option.mobility === normalized);
      const list = [...base];
      if (savedVehicleOption && savedVehicleOption.mobility === normalized) {
        const already = list.some((opt) => opt.name === savedVehicleOption.name);
        if (!already) list.push(savedVehicleOption);
      }
      return list.map((option) => ({
        id: option.id,
        name: option.name,
        favorite: option.favorite,
        meta: formatVehicleConsumptionDisplay(option.ref) ?? undefined,
      }));
    },
    [vehicleOptions, savedVehicleOption]
  );

  const originPoint = searchMeta?.origin;
  const destinationPoint = searchMeta?.destination;

  const triggerReroute = useCallback(
    async (mobilityValue, routeTypeValue, vehicleIdValue) => {
      if (!originPoint || !destinationPoint) return;
      const vehicle = vehicleIdValue ? vehicleLookup.get(vehicleIdValue) : savedVehicleSnapshot;
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
    [originPoint, destinationPoint, searchRoute, user?.uid, vehicleLookup, savedVehicleSnapshot]
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
    const mobility = (route?.mobilityType || selectedMobility || "").toLowerCase();
    if ((mobility === "walk" || mobility === "bike") && Number.isFinite(route?.duration)) {
      const kcalPerMin = mobility === "walk" ? 4.5 : 6;
      const totalKcal = (route?.duration ?? 0) * kcalPerMin;
      return Number.isFinite(totalKcal) ? `${Math.round(totalKcal)} kcal` : "—";
    }
    return formatCost(route?.cost, route?.currency);
  }, [priceSnapshot, route, selectedVehicle, selectedMobility]);

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

  const resolvedOriginLabel =
    locationLabels.origin ?? searchMeta?.originLabel ?? searchMeta?.origin ?? route?.originLabel ?? route?.origin ?? "—";
  const resolvedDestinationLabel =
    locationLabels.destination ?? searchMeta?.destinationLabel ?? searchMeta?.destination ?? route?.destinationLabel ?? route?.destination ?? "—";

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

  const steps = Array.isArray(route?.steps) ? route.steps : [];

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleSaveRoute = useCallback(
    async (routeName) => {
      if (!activePlan) return;
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
          originLabel: resolvedOriginLabel,
          destinationLabel: resolvedDestinationLabel,
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
    [activePlan, searchMeta, markers, resolvedDestinationLabel, resolvedOriginLabel, route?.mobilityType, route?.routeType]
  );

  const handlePromptAndSave = useCallback(async () => {
    const customClass = {
      confirmButton: "my-confirm-btn",
      cancelButton: "my-cancel-btn",
      input: "my-input",
      actions: "mone-swal-actions",
    };

    const { value, isConfirmed } = await CustomSwal.fire({
      title: "Save Route",
      input: "text",
      inputLabel: "Route name",
      inputPlaceholder: "E.g. Home to Work",
      inputValue: searchMeta?.label ?? "",
      customClass,
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

  if (!activePlan) {
    return (
      <section className="place-row">
        <aside className="place-card default-container with-border">
          <BackButton label="Back" style={{ marginBottom: "0.20rem" }} />
          <h2 className="card-title">Route details</h2>
          <p>{loadingSavedRoute ? "Loading saved route..." : "Route details unavailable"}</p>
          {savedRouteError ? <p className="error-text">{savedRouteError}</p> : null}
          <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
            {isSavedRouteDetail ? (
              <button type="button" className="btn" onClick={goBackToList}>
                Back
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate("/searchroute", { replace: true })}
              >
                Volver a buscar
              </button>
            )}
          </div>
        </aside>
      </section>
    );
  }

  return (
    <section className="place-row">
      <aside className="place-card default-container with-border route-details-card">
        <BackButton label="Back" style={{ marginBottom: "0.25rem" }} />
        <h2 className="card-title">
          Route details {searchMeta?.label ? <span>· {searchMeta.label}</span> : null}
        </h2>
        <div className="stack route-section route-meta">
          <p>
            <strong>Origin:</strong> {resolvedOriginLabel}
            {searchMeta?.origin ? <span> - ({searchMeta.origin})</span> : null}
          </p>
          <p>
            <strong>Destination:</strong> {resolvedDestinationLabel}
            {searchMeta?.destination ? <span> - ({searchMeta.destination})</span> : null}
          </p>
        </div>

        <div className="route-stats-grid">
          <div className="route-stat">
            <p className="label">Distance</p>
            <p className="value">{formatDistance(route?.distance, route?.distanceUnit)}</p>
          </div>
          <div className="route-stat">
            <p className="label">Duration</p>
            <p className="value">{formatDuration(route?.duration)}</p>
          </div>
          <div className="route-stat">
            <p className="label">Estimated cost</p>
            <p className="value">{resolvedCostDisplay}</p>
          </div>
          <div className="route-stat">
            <p className="label">Consumption</p>
            <p className="value">{resolvedConsumptionDisplay}</p>
          </div>
        </div>

        <div className="stack route-section route-controls">
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

        <div className="route-actions">
          {isSavedRouteDetail ? (
            <button type="button" className="btn" onClick={goBackToList}>
              Back
            </button>
          ) : (
            <>
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
            </>
          )}
        </div>

        {saveError && <p className="error-text route-error">{saveError}</p>}
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
      </main>
    </section>
  );
}
