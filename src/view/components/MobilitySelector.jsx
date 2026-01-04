import React from "react";

/**
 * Props:
 * - value: "vehicle" | "bike" | "walk"
 * - onChange: fn(value)
 * - options?: [{ key, label, icon }]
 */
export default function MobilitySelector({ value = "vehicle", onChange, options }) {
  const opts = options ?? [
    { key: "vehicle", label: "Vehicle", icon: "../../resources/iconVehicle.png" },
    { key: "bike", label: "Bicycle", icon: "../../resources/iconBicycle.png" },
    { key: "walk", label: "Walking", icon: "../../resources/iconWalking.png" },
  ];

  return (
    <div className="mobility-grid" role="tablist" aria-label="Mobility method">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          className={`mobility-btn ${value === o.key ? "active" : ""}`}
          onClick={() => onChange?.(o.key)}
          aria-pressed={value === o.key}
        >
          <img src={o.icon} alt="" aria-hidden="true" />
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}