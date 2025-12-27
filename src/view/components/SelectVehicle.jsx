import React, { useState, useEffect, useRef } from "react";
// import opcional del viewmodel por defecto (puedes pasar otro fetcher vía props)
import userViewmodel from "../../viewmodel/UserViewModel";

const getDefaultOption = (mode) => {
  if (mode === "bike") {
    return { id: "default-bike", name: "Default", meta: "6 kcal/min" };
  }
  if (mode === "walk") {
    return { id: "default-walk", name: "Default", meta: "4.5 kcal/min" };
  }
  return { id: "default-vehicle", name: "Default", meta: "6.5 l/100km" };
};

const getOptionValue = (option) => {
  const rawValue = option?.id ?? option?.name ?? option?.label ?? "";
  return String(rawValue).trim();
};

const normalizeOptions = (list, mode) => {
  const arr = Array.isArray(list) ? list : [];
  const cleaned = arr
    .map((opt) => {
      const optionValue = getOptionValue(opt);
      if (!optionValue) return null;
      return opt;
    })
    .filter(Boolean);
  const defaultOpt = getDefaultOption(mode);
  const defaultValue = getOptionValue(defaultOpt);
  const hasDefault = cleaned.some((opt) => getOptionValue(opt) === defaultValue);
  if (!hasDefault) cleaned.unshift(defaultOpt);
  return cleaned;
};

export default function SelectVehicle({
  mobility = "vehicle",
  value = "",
  onChange = () => {},
  fetchVehicles = null,
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchRef = useRef(fetchVehicles);

  useEffect(() => {
    fetchRef.current = fetchVehicles;
  }, [fetchVehicles]);

  useEffect(() => {
    let canceled = false;
    async function load(mode) {
      setLoading(true);
      try {
        const getter = fetchRef.current ?? (userViewmodel && userViewmodel.getVehicles ? userViewmodel.getVehicles : null);
        if (typeof getter === "function") {
          const data = await getter(mode);
          if (!canceled) {
            const normalized = normalizeOptions(data, mode);
            setOptions(normalized);
          }
        } else {
          if (!canceled) setOptions([getDefaultOption(mode)]);
        }
      } catch (err) {
        if (!canceled) setOptions([getDefaultOption(mode)]);
      } finally {
        if (!canceled) setLoading(false);
      }
    }
    load(mobility);
    return () => { canceled = true; };
  }, [mobility, fetchVehicles]);

  const hasAutoselectedRef = useRef(false);

  useEffect(() => {
    if (loading || options.length === 0) return;
    const currentExists = options.some((opt) => getOptionValue(opt) === value);
    if (!value && !hasAutoselectedRef.current) {
      const first = options.find((opt) => !opt.disabled);
      const firstValue = first ? getOptionValue(first) : "";
      if (firstValue && firstValue !== value) {
        hasAutoselectedRef.current = true;
        onChange(firstValue);
      }
    } else if (value && !currentExists) {
      const fallback = options.find((opt) => !opt.disabled);
      const fallbackValue = fallback ? getOptionValue(fallback) : "";
      if (fallbackValue && fallbackValue !== value) onChange(fallbackValue);
    }
  }, [loading, options, value, onChange]);

  const controlledValue = value ?? ""; 

  return (
    <div className="form-row">
      <label htmlFor="vehicleSelect">Select {mobility}</label>
      <select
        id="vehicleSelect"
        value={controlledValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
      >
        {loading && (
          <option value="loading" disabled>
            Loading...
          </option>
        )}
        {!loading && options.length === 0 && (
          <option value="no-options" disabled>
            No hay opciones disponibles
          </option>
        )}
        {!loading &&
          options.map((o, idx) => {
            const rawValue = getOptionValue(o);
            const optionValue = rawValue || `opt-${idx + 1}`;
            const label = o.name ?? o.label ?? o.id ?? optionValue;
            const meta = o.meta ?? "";
            return (
              <option key={optionValue} value={optionValue}>
                {meta ? `${label} — ${meta}` : label}
              </option>
            );
          })}
      </select>
    </div>
  );
}