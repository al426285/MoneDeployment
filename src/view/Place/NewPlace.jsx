import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import LeafletMap from "../components/LeafletMap.jsx";
import { placeViewmodel } from "../../viewmodel/placeViewmodel";
import CustomSwal from "../../core/utils/CustomSwal";

const SUCCESS_BUTTON_STYLE = {
  backgroundColor: "var(--color-success, #198754)",
  borderColor: "var(--color-success, #198754)",
};

const BUTTON_CONTENT_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.45rem",
};

const PLUS_ICON_PATH = "M12 2a1 1 0 0 1 1 1v8h8a1 1 0 1 1 0 2h-8v8a1 1 0 1 1-2 0v-8H3a1 1 0 1 1 0-2h8V3a1 1 0 0 1 1-1z";
const CHECK_ICON_PATH = "M9.5 16.5 5 12l1.4-1.4 3.1 3.09 8.1-8.09L19 7l-9.5 9.5z";

export default function NewPlace() {
  const { user } = useAuth?.() ?? { user: null };

  // name: nombre final editable por el usuario
  const [name, setName] = useState("");
  // indicador: true si el usuario ha editado name manualmente
  const [nameTouched, setNameTouched] = useState(false);

  // placeName: topónimo buscado/introducido (siempre visible cuando mode === "place")
  const [placeName, setPlaceName] = useState("");

  // descripción se mantiene en placeInfo.description para compatibilidad
  const [placeInfo, setPlaceInfo] = useState({ description: "" });

  const [coords, setCoords] = useState({ lat: "", lng: "" });
  const [mode, setMode] = useState("place"); // "place" | "coords"
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ name: "", placeName: "", coords: "" });

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");

  const defaultCenter = [39.992560, -0.067387];
  const [markerPos, setMarkerPos] = useState(defaultCenter);
  const clearSuccessFeedback = useCallback(() => {
    setSuccessMessage((prev) => (prev ? "" : prev));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");
    setFieldErrors({ name: "", placeName: "", coords: "" });

    const baseName = placeName.trim();
    const trimmedName = name.trim();
    const finalName = trimmedName || baseName;
    const latValue = coords.lat ? parseFloat(coords.lat) : markerPos[0];
    const lngValue = coords.lng ? parseFloat(coords.lng) : markerPos[1];

    const validationErrors = { name: "", placeName: "", coords: "" };
    if (!finalName) {
      validationErrors.name = "Please enter a name or pick a suggestion.";
      validationErrors.placeName = "Type a toponym to search for nearby places.";
    }
    if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) {
      validationErrors.coords = "Select valid coordinates on the map or type them manually.";
    }

    const hasErrors = Object.values(validationErrors).some(Boolean);
    if (hasErrors) {
      setFieldErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: finalName,
        description: placeInfo.description?.trim() || undefined,
        latitude: latValue,
        longitude: lngValue,
        toponymicAddress: baseName || undefined,
      };
      const saved = await placeViewmodel.savePlace(payload, user?.uid);
      await CustomSwal.fire({
        title: "Place saved",
        text: `Place "${saved.name}" saved successfully.`,
        icon: "success",
        confirmButtonText: "Close",
      });
      setSuccessMessage(`Place "${saved.name}" saved successfully.`);
    } catch (err) {
      const msg = err?.message || "The place could not be saved.";
      if (String(msg).includes("PlaceAlreadySavedException")) {
        setFormError("This place is already saved.");
      } else {
        setFormError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query = placeName.trim();
    if (mode !== "place" || query.length < 3) {
      setSuggestions([]);
      setSuggestionError("");
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setSuggestionsLoading(true);
        const results = await placeViewmodel.suggestToponyms(query, 6);
        if (!cancelled) {
          setSuggestions(results);
          setSuggestionError("");
        }
      } catch (err) {
        if (!cancelled) setSuggestionError(err?.message || "Could not load toponym suggestions.");
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [placeName, mode]);

  const applyCoords = () => {
    clearSuccessFeedback();
    setFormError("");
    setFieldErrors((prev) => ({ ...prev, coords: "" }));
    const lat = parseFloat(coords.lat);
    const lng = parseFloat(coords.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setFieldErrors((prev) => ({ ...prev, coords: "Enter valid numeric coordinates." }));
      return false;
    }
    setMarkerPos([lat, lng]);
    setMode("coords");
    fetchToponymFromCoords(lat, lng);
    return true;
  };

  const onPlaceNameChange = (val) => {
    clearSuccessFeedback();
    setPlaceName(val);
    setFieldErrors((prev) => ({ ...prev, placeName: "" }));
    if (!nameTouched) {
      setName(val);
    }
  };

  const onNameChange = (val) => {
    clearSuccessFeedback();
    setName(val);
    setNameTouched(true);
    setFieldErrors((prev) => ({ ...prev, name: "" }));
  };

  const onDescriptionChange = (val) => {
    clearSuccessFeedback();
    setPlaceInfo((prev) => ({ ...prev, description: val }));
  };

  const fetchToponymFromCoords = useCallback(
    async (lat, lng) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      try {
        const suggestion = await placeViewmodel.toponymFromCoords(lat, lng);
        if (suggestion?.label) {
          setPlaceName(suggestion.label);
          if (!nameTouched) setName(suggestion.label);
          setFieldErrors((prev) => ({ ...prev, name: "", placeName: "" }));
        }
      } catch (err) {
        console.warn("Could not resolve toponym", err);
      }
    },
    [nameTouched]
  );

  const updateCoords = (field, value) => {
    clearSuccessFeedback();
    setCoords((prev) => ({ ...prev, [field]: value }));
  };

  const selectSuggestion = (suggestion) => {
    clearSuccessFeedback();
    setPlaceName(suggestion.label);
    if (!nameTouched) setName(suggestion.label);
    if (Number.isFinite(suggestion.latitude) && Number.isFinite(suggestion.longitude)) {
      setMarkerPos([suggestion.latitude, suggestion.longitude]);
      setCoords({ lat: suggestion.latitude.toFixed(6), lng: suggestion.longitude.toFixed(6) });
    }
    setMode("place");
    setSuggestions([]);
    setFieldErrors({ name: "", placeName: "", coords: "" });
  };

  const isSuccess = Boolean(successMessage);
  const buttonLabel = isSuccess ? "Place added successfully" : "Add the new place";
  const buttonIconPath = isSuccess ? CHECK_ICON_PATH : PLUS_ICON_PATH;
  const buttonStyle = isSuccess ? SUCCESS_BUTTON_STYLE : undefined;

  return (
    <section className="place-row">
      <aside className="place-card default-container with-border">
        <h2 className="card-title">New Place</h2>

        <form onSubmit={handleSubmit} className="stack">
          <div className="form-row">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              placeholder="Enter a name for the place"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
            {fieldErrors.name && <p className="error-text">{fieldErrors.name}</p>}
          </div>

          <div className="form-row">
            <label htmlFor="description">Description</label>
            <input
              id="description"
              type="text"
              placeholder="Add a description of the place"
              value={placeInfo.description}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label>Location</label>
            <div className="location-toggle" role="tablist" aria-label="Location selector">
              <button
                type="button"
                className={`segmented-btn ${mode === "place" ? "active" : ""}`}
                onClick={() => {
                  clearSuccessFeedback();
                  setMode("place");
                }}
              >
                Place name
              </button>
              <button
                type="button"
                className={`segmented-btn ${mode === "coords" ? "active" : ""}`}
                onClick={() => {
                  clearSuccessFeedback();
                  setMode("coords");
                }}
              >
                Coordinates
              </button>
            </div>
          </div>

          {mode === "place" ? (
            <div className="form-row">
              <label htmlFor="placeName">Enter the place name</label>
              <div style={{ position: "relative" }}>
                <input
                  id="placeName"
                  type="text"
                  placeholder="Enter a place name"
                  value={placeName}
                  onChange={(e) => onPlaceNameChange(e.target.value)}
                  autoComplete="off"
                />
                {suggestionsLoading && <span className="info-text" style={{ position: "absolute", top: "50%", right: "0.5rem", transform: "translateY(-50%)", fontSize: "0.75rem" }}>Buscando…</span>}
                {suggestions.length > 0 && (
                  <ul
                    className="saved-list"
                    style={{
                      position: "absolute",
                      top: "65%",
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      maxHeight: 200,
                      overflowY: "auto",
                      background: "var(--color-secondary)",
                      border: "1px solid #ddd",
                      marginTop: "4px",
                    }}
                  >
                    {suggestions.map((suggestion) => (
                      <li
                        key={suggestion.id}
                        className="saved-item"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          selectSuggestion(suggestion);
                        }}
                      >
                        <div className="saved-title">{suggestion.label}</div>
                        <div className="saved-coords">
                          {suggestion.context || ""}
                          {suggestion.context ? " • " : ""}
                          {suggestion.latitude.toFixed(4)}, {suggestion.longitude.toFixed(4)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {fieldErrors.placeName && <p className="error-text" style={{ marginTop: "0.4rem" }}>{fieldErrors.placeName}</p>}
              {suggestionError && <p className="error-text" style={{ marginTop: "0.4rem" }}>{suggestionError}</p>}
            </div>
          ) : (
            <div className="form-row">
              <label>Enter coordinates</label>
              <div className="coords-row">
                <input
                  type="text"
                  placeholder="Lat"
                  value={coords.lat}
                  onChange={(e) => updateCoords("lat", e.target.value)}
                  onBlur={applyCoords}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoords(); } }}
                />
                <input
                  type="text"
                  placeholder="Lng"
                  value={coords.lng}
                  onChange={(e) => updateCoords("lng", e.target.value)}
                  onBlur={applyCoords}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoords(); } }}
                />
              </div>
              {fieldErrors.coords && <p className="error-text" style={{ marginTop: "0.4rem" }}>{fieldErrors.coords}</p>}
            </div>
          )}

          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            width: "100%"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.6rem",
              width: "100%"
            }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={buttonStyle}
              >
                <span className="btn-content" style={BUTTON_CONTENT_STYLE}>
                  <svg className="add-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d={buttonIconPath} />
                  </svg>
                  {buttonLabel}
                </span>
              </button>
            </div>


            {formError && (
              <p className="error-text" style={{ textAlign: "center", margin: 0 }}>
                {formError}
              </p>
            )}
          </div>
        </form>
      </aside>

      <main className="map-panel">
        <LeafletMap
          center={markerPos}
          zoom={13}
          markers={markerPos ? [markerPos] : []}
          polyline={[]}
          onMapClick={(coords) => {
            clearSuccessFeedback();
            const [lat, lng] = coords;
            setMarkerPos([lat, lng]);
            setCoords({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
            setMode("coords");
            setSuggestions([]);
            setFieldErrors((prev) => ({ ...prev, coords: "" }));
            fetchToponymFromCoords(lat, lng);
          }}
          style={{ minHeight: 520 }}
        />
      </main>
    </section>
  );
}