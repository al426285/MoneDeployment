import React from "react";

export default function FavoriteToggle({ active = false, onToggle = () => {}, size = 18, label = "Favorite" }) {
  const title = active ? "Quitar de favoritos" : "Añadir a favoritos";
  return (
    <button
      type="button"
      className="favorite-toggle"
      aria-pressed={active}
      aria-label={label}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(!active);
      }}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          fontSize: size,
          color: active ? "#f4b400" : "#aaa",
          transition: "color 0.15s ease",
        }}
      >
        ★
      </span>
    </button>
  );
}
