import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { placeViewmodel } from "../../viewmodel/placeViewmodel";
import EditDeleteActions from "../components/EditDeleteActions.jsx";
import Swal from "sweetalert2";

const PLUS_ICON_PATH = "M12 2a1 1 0 0 1 1 1v8h8a1 1 0 1 1 0 2h-8v8a1 1 0 1 1-2 0v-8H3a1 1 0 1 1 0-2h8V3a1 1 0 0 1 1-1z";

export default function ListPlaces({ onAddPlace, onEditPlace, className = "" }) {
  const navigate = useNavigate();
  const [places, setPlaces] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const loadPlaces = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await placeViewmodel.getPlaces();
      setPlaces(Array.isArray(response) ? response : []);
    } catch (err) {
      setError(err?.message || "Unable to load places.");
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  const filteredPlaces = useMemo(() => {
    if (!query.trim()) return places;
    const needle = query.trim().toLowerCase();
    return places.filter((place) => {
      const parts = [
        place?.name,
        place?.toponymicAddress,
        place?.description,
        place?.latitude,
        place?.longitude,
      ]
        .filter((segment) => segment !== undefined && segment !== null)
        .map((segment) => String(segment).toLowerCase());
      return parts.some((segment) => segment.includes(needle));
    });
  }, [places, query]);

  const handleAddPlace = () => {
    if (typeof onAddPlace === "function") {
      onAddPlace();
      return;
    }
    navigate("/places/new");
  };

  const findPlace = (id) => places.find((p) => p?.id === id);

  const handleEditPlace = (placeId) => {
    if (!placeId) return;
    const place = findPlace(placeId);
    if (typeof onEditPlace === "function") {
      onEditPlace(place ?? null);
      return;
    }
    navigate(`/places/edit/${placeId}`);
  };

  const handleDeletePlace = async (placeId) => {
    if (!placeId) return;
    const place = findPlace(placeId);

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete "${place?.name || "Unnamed place"}". This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: "Cancel",
      confirmButtonText: "Yes, delete",
      background: "#E0E6D5",
      color: "#585233",
      customClass: {
        cancelButton: "my-cancel-btn",
        confirmButton: "my-confirm-btn",
      },
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    setDeletingId(placeId);
    try {
      await placeViewmodel.deletePlace(placeId);
      setPlaces((prev) => prev.filter((item) => item.id !== placeId));
      await Swal.fire({
        title: "Deleted!",
        text: `\"${place?.name || "Unnamed place"}\" has been removed successfully.`,
        icon: "success",
        background: "#E0E6D5",
        color: "#585233",
        customClass: { confirmButton: "my-confirm-btn" },
      });
    } catch (err) {
      setError(err?.message || "Unable to delete place.");
    } finally {
      setDeletingId("");
    }
  };

  const formatMeta = (place) => {
    const metaParts = [];
    if (place?.toponymicAddress) metaParts.push(place.toponymicAddress);
    const lat = Number(place?.latitude);
    const lng = Number(place?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      metaParts.push(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
    return metaParts.join(" · ");
  };

  const cardIcon = (
    <svg viewBox="0 0 24 24" className="item-icon">
      <path
        fill="currentColor"
        d="M12 2C9 2 5 5 5 10c0 6.5 7 12 7 12s7-5.5 7-12c0-5-4-8-7-8zM12 12.5A2.5 2.5 0 1 1 12 7.5a2.5 2.5 0 0 1 0 5z"
      />
    </svg>
  );

  const renderCard = (place) => (
    <li key={place.id ?? `${place.latitude}-${place.longitude}`} className="item-card">
      <div className="item-card__icon" aria-hidden>
        {cardIcon}
      </div>
      <div className="item-card__content">
        <div className="item-card__title">{place?.name || "Unnamed place"}</div>
        <div className="item-card__meta">{formatMeta(place) || "No extra information"}</div>
        {place?.description && <p className="item-card__meta">{place.description}</p>}
      </div>
      <EditDeleteActions
        id={place?.id}
        editTarget={(id) => `/places/edit/${id}`}
        onEdit={(id) => handleEditPlace(id)}
        onDelete={(id) => handleDeletePlace(id)}
      />
    </li>
  );

  const renderSection = (title, list, emptyLabel) => (
    <section className="list-section">
      <h2 className="section-title">{title}</h2>
      <ul className="item-list">
        {loading ? (
          <li className="item-card item-card--empty">Loading places...</li>
        ) : list.length === 0 ? (
          <li className="item-card item-card--empty">{emptyLabel}</li>
        ) : (
          list.map((place) => renderCard(place))
        )}
      </ul>
    </section>
  );

  const recentPlaces = useMemo(() => filteredPlaces.slice(0, 3), [filteredPlaces]);
  // Sólo toma los marcados explícitamente como favoritos; no hay fallback inventado
  const favoritePlaces = useMemo(
    () => filteredPlaces.filter((place) => Boolean(place?.isFavorite || place?.favorite)),
    [filteredPlaces]
  );

  const remainingPlaces = useMemo(() => {
    const favoriteIds = new Set(favoritePlaces.map((p) => p?.id));
    return filteredPlaces.filter((place) => !favoriteIds.has(place?.id));
  }, [filteredPlaces, favoritePlaces]);

  return (
    <div className={`page-content ${className}`.trim()}>
      <div className="page-header">
        <h1 className="page-title">My Saved Places</h1>
        <button type="button" className="btn btn-primary btn-add" onClick={handleAddPlace}>
          <svg className="add-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d={PLUS_ICON_PATH} />
          </svg>
          New Place
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search-bar"
          type="search"
          placeholder="Search saved places by name or description..."
          aria-label="Search places"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && (
        <div className="error-text" style={{ marginBottom: "0.75rem" }}>
          {error}
          <button type="button" className="btn btn-secondary" style={{ marginLeft: "0.5rem" }} onClick={loadPlaces}>
            Retry
          </button>
        </div>
      )}

      {renderSection(
        "Recent",
        recentPlaces,
        places.length === 0 ? "You have not saved any places yet." : "No recent places match your search."
      )}

      {renderSection(
        "Favorites",
        favoritePlaces,
        favoritePlaces.length === 0
          ? "No favorite places yet."
          : filteredPlaces.length === 0
          ? "No places match your search."
          : "Mark some places as favorites to see them here."
      )}

      {renderSection(
        "All Saved Places",
        remainingPlaces,
        filteredPlaces.length === 0 ? "No places match your search." : "All filtered places are shown above."
      )}
    </div>
  );
}
