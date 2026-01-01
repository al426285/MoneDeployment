import React, { useEffect, useState } from "react";
import {
    getUserMeasurementPreferences,
    saveUserMeasurementPreferences,
} from "../../viewmodel/UserViewModel";

const distanceOptions = [
    { value: "km", label: "km" },
    { value: "mi", label: "mi" },
    { value: "m", label: "m" },
];

const combustionOptions = [
    { value: "l/100km", label: "l/100km" },
    { value: "km/l", label: "km/L" },
];

const electricOptions = [
    { value: "kwh/100km", label: "kWh/100km" },
    { value: "km/kwh", label: "km/kWh" },
];

export default function UnitsManagement() {
    const [preferences, setPreferences] = useState({
        distanceUnit: "km",
        combustionConsumptionUnit: "l/100km",
        electricConsumptionUnit: "kwh/100km",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        let mounted = true;
        const fetchPreferences = async () => {
            setError("");
            try {
                const data = await getUserMeasurementPreferences();
                if (!mounted) return;
                setPreferences(data);
            } catch (err) {
                if (!mounted) return;
                setError((err && err.message) || "No se pudieron cargar las preferencias.");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchPreferences();
        return () => {
            mounted = false;
        };
    }, []);

    const handleChange = (field) => (event) => {
        setPreferences((prev) => ({ ...prev, [field]: event.target.value }));
        setSuccessMessage("");
        setError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setSuccessMessage("");
        try {
            const updated = await saveUserMeasurementPreferences(preferences);
            setPreferences(updated);
            setSuccessMessage("Preferences updated successfully.");
        } catch (err) {
            setError((err && err.message) || "No se pudieron guardar las preferencias.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ maxWidth: "1000px", margin: "1rem auto", padding: "1rem", boxSizing: "border-box" }}>
            <div className="settings-row">
                <div className="settings-title">
                    <h2>Unit Of Measurement Preferences</h2>
                    <p>Set your favourites unit of measurement.</p>
                </div>

                <div className="settings-form">
                    <div className="default-container settings-container with-border" style={{ padding: "1rem" }}>
                        {loading ? (
                            <p>Cargando preferencias...</p>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <label htmlFor="distanceUnit">To measure the distance</label>
                                <select
                                    id="distanceUnit"
                                    value={preferences.distanceUnit}
                                    onChange={handleChange("distanceUnit")}
                                    disabled={saving}
                                >
                                    {distanceOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>

                                <label htmlFor="electricConsumptionUnit" style={{ marginTop: "0.75rem" }}>
                                    Preferred electric consumption unit
                                </label>
                                <select
                                    id="electricConsumptionUnit"
                                    value={preferences.electricConsumptionUnit}
                                    onChange={handleChange("electricConsumptionUnit")}
                                    disabled={saving}
                                >
                                    {electricOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>

                                <label htmlFor="combustionConsumptionUnit" style={{ marginTop: "0.75rem" }}>
                                    Preferred combustion consumption unit
                                </label>
                                <select
                                    id="combustionConsumptionUnit"
                                    value={preferences.combustionConsumptionUnit}
                                    onChange={handleChange("combustionConsumptionUnit")}
                                    disabled={saving}
                                >
                                    {combustionOptions.map((option) => (
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
