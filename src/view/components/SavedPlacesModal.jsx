import React, { useEffect, useMemo, useState } from "react";
import { placeViewmodel } from "../../viewmodel/placeViewmodel";

const formatCoords = (coords) => {
  if (!Array.isArray(coords) || coords.length !== 2) return "";
  const [lat, lng] = coords;
  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
};

export default function SavedPlacesModal({ open, onSelect, onClose, title = "Lugares guardados" }) {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const results = await placeViewmodel.getPlaces();
        if (cancelled) return;

        const normalized = Array.isArray(results)
          ? results.map((p) => ({
              ...p,
              favorite: Boolean(p?.favorite || p?.isFavorite),
              isFavorite: Boolean(p?.favorite || p?.isFavorite),
              coords: Array.isArray(p.coords)
                ? p.coords
                : Array.isArray(p.latitude)
                ? p.latitude
                : [Number(p.latitude ?? p.lat ?? p.latitude), Number(p.longitude ?? p.lng ?? p.longitude)],
            }))
          : [];

        const fixed = normalized.map((p) => {
          if (Array.isArray(p.coords) && p.coords.length === 2 && p.coords.every((n) => Number.isFinite(Number(n)))) return p;
          const lat = Number(p.latitude ?? p.lat ?? NaN);
          const lng = Number(p.longitude ?? p.lng ?? NaN);
          if (Number.isFinite(lat) && Number.isFinite(lng)) return { ...p, coords: [lat, lng] };
          return p;
        });

        setPlaces(fixed);
      } catch (err) {
        if (!cancelled) setError(err?.message || "No se pudieron cargar los lugares guardados.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const sortedPlaces = useMemo(() => {
    return [...places].sort((a, b) => {
      const favA = Number(Boolean(a.favorite || a.isFavorite));
      const favB = Number(Boolean(b.favorite || b.isFavorite));
      if (favA !== favB) return favB - favA;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [places]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="saved-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="saved-modal-header">
          <div>
            <h3>{title}</h3>
            <p className="saved-sub">Selecciona un lugar guardado.</p>
          </div>
          <button className="picker-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {loading && <p className="info-text">Cargando lugares guardados…</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && (
          <ul className="saved-list">
            {sortedPlaces.map((p) => {
              const isFav = Boolean(p.favorite || p.isFavorite);
              return (
                <li
                  key={p.id || p.name}
                  className="saved-item"
                  onClick={() => {
                    try {
                      onSelect?.(p);
                    } finally {
                      onClose?.();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      try {
                        onSelect?.(p);
                      } finally {
                        onClose?.();
                      }
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="saved-item-main">
                    <div className="saved-title-row">
                      <span className="saved-title">{p.name}</span>
                      {isFav && <span className="saved-fav">★</span>}
                    </div>
                    <div className="saved-meta">
                      <span>{formatCoords(p.coords)}</span>
                      {p.city && <span className="saved-chip">{p.city}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
            {sortedPlaces.length === 0 && <li className="saved-item">No hay lugares guardados.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}