import React, { useState, useEffect } from "react";
// import opcional del viewmodel por defecto (puedes pasar otro fetcher vía props)

export default function SelectVehicle({
  mobility = "vehicle",
  value = "",
  onChange = () => {},
  fetchVehicles = null, // opcional: función (mode) => Promise<array>
  placeholderLabel = "Default",
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let canceled = false;
    async function load(mode) {
      setLoading(true);
      try {
        const getter = fetchVehicles ?? (userViewmodel && userViewmodel.getVehicles ? userViewmodel.getVehicles : null);
        if (typeof getter === "function") {
          const data = await getter(mode);
          if (!canceled) setOptions(Array.isArray(data) ? data : []);
        } else {
          // fallback local
          const fallback = mode === "vehicle"
            ? [{ id: "veh_a", name: "Vehicle A" }, { id: "veh_b", name: "Vehicle B" }]
            : mode === "bike"
              ? [{ id: "bike_a", name: "Bike A" }, { id: "bike_b", name: "Bike B" }]
              : [{ id: "walk_a", name: "On foot" }];
          if (!canceled) setOptions(fallback);
        }
      } catch (err) {
        if (!canceled) setOptions([]);
      } finally {
        if (!canceled) setLoading(false);
      }
    }
    load(mobility);
    return () => { canceled = true; };
  }, [mobility, fetchVehicles]);

  return (
    <div className="form-row">
      <label htmlFor="mobilityType">Select {mobility}</label>
      <select
        id="mobilityType"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
      >
        <option value="">{placeholderLabel}</option>
        {options.map((o) => (
          <option key={o.id ?? o.name} value={o.id ?? o.name}>
            {o.name ?? o.label ?? o.id}
          </option>
        ))}
      </select>
    </div>
  );
}