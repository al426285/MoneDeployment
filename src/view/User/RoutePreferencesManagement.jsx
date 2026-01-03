import React, { useEffect, useMemo, useState } from "react";
import {
    getUserDefaultOptions,
    saveUserDefaultOptions,
} from "../../viewmodel/UserViewModel";
import { VehicleService } from "../../domain/service/VehicleService";

const mobilityOptions = [
    { value: "vehicle", label: "Vehicle" },
    { value: "bike", label: "Bicycle" },
    { value: "walk", label: "Walking" },
];

const routeTypeOptions = [
    { value: "fastest", label: "The fastest" },
    { value: "shortest", label: "The shortest" },
    { value: "scenic", label: "The most economical" },
];

const normalizeString = (value) => (value ?? "").toString().trim().toLowerCase();

const resolveMobilityFromVehicle = (vehicle) => {
    const explicit = normalizeString(vehicle?.mobilityType ?? vehicle?.mobilityMethod ?? vehicle?.category);
    if (["vehicle", "bike", "walk"].includes(explicit)) {
        return explicit;
    }

    const type = normalizeString(vehicle?.type);
    if (type.includes("walk")) return "walk";
    if (type.includes("bike") || type.includes("bici") || type.includes("cycle")) return "bike";
    if (type.includes("car") || type.includes("vehicle")) return "vehicle";

    const fuelType = normalizeString(vehicle?.fuelType);
    if (["gasoline", "diesel", "electric"].includes(fuelType)) {
        return "vehicle";
    }

    const unit = normalizeString(vehicle?.consumptionUnit ?? vehicle?.consumption?.unit);
    if (unit === "kcal/min") {
        return type.includes("walk") ? "walk" : "bike";
    }
    if (unit.includes("/100km") || unit.includes("km/")) {
        return "vehicle";
    }

    return "vehicle";
};

const filterVehiclesByMode = (mode, vehicles) => {
    if (!mode) return [];
    const normalizedMode = normalizeString(mode);
    return vehicles.filter((vehicle) => resolveMobilityFromVehicle(vehicle) === normalizedMode);
};

export default function RoutePreferencesManagement() {
    const [defaults, setDefaults] = useState({
        transportMode: "vehicle",
        routeType: "fastest",
        vehicleName: null,
    });
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [vehiclesLoading, setVehiclesLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        let mounted = true;
        const fetchDefaults = async () => {
            try {
                const prefs = await getUserDefaultOptions();
                if (!mounted) return;
                setDefaults(prefs);
            } catch (err) {
                if (!mounted) return;
                setError((err && err.message) || "No se pudieron cargar las preferencias de ruta.");
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchDefaults();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        const loadVehicles = async () => {
            setVehiclesLoading(true);
            try {
                const service = VehicleService.getInstance();
                const list = await service.getVehicles(undefined);
                if (!mounted) return;
                setVehicles(
                    list.map((vehicle) => ({
                        name: vehicle.name,
                        type: vehicle.type,
                        fuelType: vehicle.fuelType ?? null,
                        consumptionUnit: vehicle.consumption?.unit ?? "",
                        mobilityType: vehicle.mobilityType ?? null,
                        mobilityMethod: vehicle.mobilityMethod ?? null,
                        category: vehicle.category ?? null,
                    }))
                );
            } catch (err) {
                if (!mounted) return;
                setError((err && err.message) || "No se pudieron cargar los vehículos disponibles.");
            } finally {
                if (mounted) setVehiclesLoading(false);
            }
        };
        loadVehicles();
        return () => {
            mounted = false;
        };
    }, []);

    const filteredVehicles = useMemo(
        () => filterVehiclesByMode(defaults.transportMode, vehicles),
        [defaults.transportMode, vehicles]
    );

    const handleTransportChange = (newMode) => {
        setError("");
        setSuccessMessage("");
        setDefaults((prev) => {
            const allowedVehicles = filterVehiclesByMode(newMode, vehicles);
            const currentVehicle = allowedVehicles.some((v) => v.name === prev.vehicleName)
                ? prev.vehicleName
                : null;
            return { ...prev, transportMode: newMode, vehicleName: currentVehicle };
        });
    };

    const handleVehicleChange = (newVehicle) => {
        setError("");
        setSuccessMessage("");
        setDefaults((prev) => ({ ...prev, vehicleName: newVehicle || null }));
    };

    const handleRouteTypeChange = (newRouteType) => {
        setError("");
        setSuccessMessage("");
        setDefaults((prev) => ({ ...prev, routeType: newRouteType }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setSuccessMessage("");
        try {
            const payload = {
                transportMode: defaults.transportMode,
                routeType: defaults.routeType,
                vehicleName: defaults.vehicleName,
            };
            const updated = await saveUserDefaultOptions(payload);
            setDefaults(updated);
            setSuccessMessage("Route preferences updated successfully.");
        } catch (err) {
            setError((err && err.message) || "No se pudieron guardar las preferencias de ruta.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ maxWidth: "1000px", margin: "1rem auto", padding: "1rem", boxSizing: "border-box" }}>
            <div className="settings-row">
                <div className="settings-title">
                    <h2>Route Preferences</h2>
                    <p>Set your default options for calculating routes.</p>
                </div>

                <div className="settings-form">
                    <div className="default-container settings-container with-border" style={{ padding: "1rem" }}>
                        {loading ? (
                            <p>Cargando preferencias...</p>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <label htmlFor="defaultTransport">Default mobility method</label>
                                <select
                                    id="defaultTransport"
                                    value={defaults.transportMode}
                                    onChange={(e) => handleTransportChange(e.target.value)}
                                    disabled={saving}
                                >
                                    {mobilityOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>

                                <label htmlFor="defaultVehicle" style={{ marginTop: "0.75rem" }}>
                                    Default vehicle
                                </label>
                                {vehiclesLoading ? (
                                    <p style={{ margin: "0.5rem 0" }}>Cargando vehículos...</p>
                                ) : !defaults.transportMode ? (
                                    <p style={{ margin: "0.5rem 0" }}>Select a mobility method previously.</p>
                                ) : filteredVehicles.length === 0 ? (
                                    <p style={{ margin: "0.5rem 0" }}>No vehicles available for this mobility method.</p>
                                ) : (
                                    <select
                                        id="defaultVehicle"
                                        value={defaults.vehicleName ?? ""}
                                        onChange={(e) => handleVehicleChange(e.target.value || null)}
                                        disabled={saving}
                                    >
                                        <option value="">No default vehicle</option>
                                        {filteredVehicles.map((vehicle) => (
                                            <option key={vehicle.name} value={vehicle.name}>
                                                {vehicle.name}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                <label htmlFor="defaultRouteType" style={{ marginTop: "0.75rem" }}>
                                    Preferred route type
                                </label>
                                <select
                                    id="defaultRouteType"
                                    value={defaults.routeType}
                                    onChange={(e) => handleRouteTypeChange(e.target.value)}
                                    disabled={saving}
                                >
                                    {routeTypeOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>

                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
                                    <button type="submit" className="btn btn-primary account-save-btn" disabled={saving}>
                                        {saving ? "Saving..." : "Save Preferences"}
                                    </button>
                                </div>
                                {successMessage && <p style={{ color: "green", marginTop: "0.6rem" }}>{successMessage}</p>}
                                {error && <p style={{ color: "red", marginTop: "0.6rem" }}>{error}</p>}
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
