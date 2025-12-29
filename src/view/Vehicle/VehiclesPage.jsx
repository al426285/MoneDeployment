import React, { useMemo, useState, useRef } from "react";
import EditDeleteActions from "../components/EditDeleteActions.jsx";
import FavoriteToggle from "../components/FavoriteToggle.jsx";
import { VehicleViewModel } from "../../viewmodel/VehicleViewModel";
import CustomSwal from "../../core/utils/CustomSwal.js";
import { isValidVehicleName } from "../../core/utils/validators";
export default function VehiclesPage() {
  const {
    vehicles,
    loading,
    error,
    loadVehicles,
    addVehicle,
    deleteVehicle,
    updateVehicle,
    setFavorite,
    getFuelUnitsPreference,
    getElectricUnitsPreference,
  } = VehicleViewModel();

  const [searchTerm, setSearchTerm] = useState("");
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", fuelType: "", consumption: "" });

  // Estado inmediato y persistente del formulario (guardar contenido formulario para mostrar al hace back)
  const wizardFormStateRef = useRef({
    name: "",
    type: "",
    units: "",
    fuelType: null,
    consumption: null,
  });

  //Preferencias de unidades, deberia de venir del viewmodel
  //seria = get....
  const [unitPreference, setUnitPreference] = useState({
    fuel: "L/100km", //getFuelUnitsPreference(),
    electric: "kWh/100km", //getElectricUnitsPreference()
  });

  const PLUS_ICON_PATH =
    "M12 2a1 1 0 0 1 1 1v8h8a1 1 0 1 1 0 2h-8v8a1 1 0 1 1-2 0v-8H3a1 1 0 1 1 0-2h8V3a1 1 0 0 1 1-1z";

  const filteredVehicles = useMemo(() => {
    const sorted = [...vehicles].sort(
      (a, b) => Number(Boolean(b?.favorite || b?.isFavorite)) - Number(Boolean(a?.favorite || a?.isFavorite))
    );
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return sorted;
    return sorted.filter((vehicle) => {
      const nameMatch = vehicle.name?.toLowerCase().includes(normalized);
      const typeMatch = vehicle.type?.toLowerCase().includes(normalized);
      const fuelMatch = vehicle.fuelType ? vehicle.fuelType.toLowerCase().includes(normalized) : false;
      return nameMatch || typeMatch || fuelMatch;
    });
  }, [vehicles, searchTerm]);

  // separamos por por tipo y vemos que cumplen con el filtro
  const bikes = useMemo(() => filteredVehicles.filter((v) => v.type === "Bike"), [filteredVehicles]);
  const walkings = useMemo(() => filteredVehicles.filter((v) => v.type === "Walking"), [filteredVehicles]);
  const regularVehicles = useMemo(() => filteredVehicles.filter((v) => v.type !== "Bike" && v.type !== "Walking"), [filteredVehicles]);


  const getVehicleImage = (vehicle) => {
    switch (vehicle.type) {
      case "Bike":
        return "../../../resources/iconBicicle.png";
      case "Walking":
        return "../../../resources/iconWalking.png";
      default:
        return "../../../resources/iconVehicle.png";
    }
  };

  const handleAddClick = async () => {
    const customClass = {
      confirmButton: "my-confirm-btn",
      cancelButton: "my-cancel-btn",
      denyButton: "my-back-btn",
      input: "my-input",
      actions: "mone-swal-actions",
    };

    // PASO 1: Nombre y Tipo (walking, bicycle, vehicle)
    const step1 = await CustomSwal.fire({
      title: "Add Mobility Method",
      html: `
        <div style="text-align: left;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Name</label>
          <input type="text" id="vehicleName" class="my-input" value="${wizardFormStateRef.current.name}" style="width: 100%; box-sizing: border-box;" />
          
          <label style="display: block; margin-top: 1rem; margin-bottom: 0.5rem; font-weight: 600;">Type</label>
          <select id="vehicleType" class="my-select" style="width: 100%; padding: 0.5rem; border: 1px solid #585233; border-radius: 4px;">
            <option value="" disabled ${!wizardFormStateRef.current.type ? "selected" : ""}>Select type</option>
            <option value="bike" ${wizardFormStateRef.current.type === "bike" ? "selected" : ""}>Bike</option>
            <option value="walking" ${wizardFormStateRef.current.type === "walking" ? "selected" : ""}>Walking</option>
            <option value="car" ${wizardFormStateRef.current.type === "car" ? "selected" : ""}>Vehicle</option>
          </select>
        </div>
      `,
      background: "#CCD5B9",
      color: "#585233",
      customClass,
      showCancelButton: true,
      confirmButtonText: "Next",
      cancelButtonText: "Cancel",
      focusConfirm: false,
      didOpen: () => {
        const nameInput = CustomSwal.getPopup().querySelector('#vehicleName');
        nameInput?.focus();
      },
      preConfirm: () => {
        const name = CustomSwal.getPopup().querySelector('#vehicleName')?.value || "";
        const type = CustomSwal.getPopup().querySelector('#vehicleType')?.value || "";
        
        if (!name) {
          CustomSwal.showValidationMessage("Name is required");
          return false;
        }
        if (!isValidVehicleName(name)) {
          CustomSwal.showValidationMessage("Invalid name format");
          return false;
        }
        if (!type) {
          CustomSwal.showValidationMessage("Type is required");
          return false;
        }
        return { name, type };
      },
    });
    if (!step1.value) {
      wizardFormStateRef.current = { name: "", type: "", units: "", fuelType: null, consumption: null };
      return;
    }

    wizardFormStateRef.current.name = step1.value.name;
    wizardFormStateRef.current.type = step1.value.type;

    // PASO 2: Características según tipo
    if (step1.value.type === "bike" || step1.value.type === "walking") {
      const step2 = await CustomSwal.fire({
        title: `Configure ${capitalize(step1.value.type)}`,
        html: `
          <div style="text-align: left;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Average calories consumption (kcal/min)</label>
            <input type="number" id="consumption" class="my-input" value="${wizardFormStateRef.current.consumption ?? ""}" min="0" step="0.1" style="width: 100%; box-sizing: border-box;" />
          </div>
        `,
        background: "#CCD5B9",
        color: "#585233",
        customClass,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Save",
        denyButtonText: "Back",
        cancelButtonText: "Cancel",
        focusConfirm: false,
        didOpen: () => {
          CustomSwal.getPopup().querySelector('#consumption')?.focus();
        },
        preConfirm: () => {
          const consumption = parseFloat(CustomSwal.getPopup().querySelector('#consumption')?.value || "0");
          if (!consumption || consumption <= 0) {
            CustomSwal.showValidationMessage("Consumption must be greater than 0");
            return false;
          }
          return consumption;
        },
      });

      if (step2.isDenied) {
        const currentConsumption = parseFloat(CustomSwal.getPopup().querySelector('#consumption')?.value || "0");
        wizardFormStateRef.current.consumption = currentConsumption || wizardFormStateRef.current.consumption;
        return handleAddClick();
      }

      if (!step2.value) {
        wizardFormStateRef.current = { name: "", type: "", units: "", fuelType: null, consumption: null };
        return;
      }

      await addVehicle(
        step1.value.type,
        step1.value.name,
        "",
        null,
        step2.value
      );

      wizardFormStateRef.current = { name: "", type: "", units: "", fuelType: null, consumption: null };
      return;
    }

    if (step1.value.type === "car") {
      const fuelResult = await CustomSwal.fire({
        title: "Fuel Type",
        html: `
          <select id="fuelType" class="my-select" style="width: 100%; padding: 0.5rem; border: 1px solid #585233; border-radius: 4px;">
            <option value="" disabled ${!wizardFormStateRef.current.fuelType && wizardFormStateRef.current.type !== "electricCar" && wizardFormStateRef.current.type !== "fuelCar" ? "selected" : ""}>Select type</option>
            <option value="electric" ${wizardFormStateRef.current.fuelType === "electric" ? "selected" : ""}>Electric</option>
            <option value="gasoline" ${wizardFormStateRef.current.fuelType === "gasoline" ? "selected" : ""}>Gasoline</option>
            <option value="diesel" ${wizardFormStateRef.current.fuelType === "diesel" ? "selected" : ""}>Diesel</option>
          </select>
        `,
        background: "#CCD5B9",
        color: "#585233",
        customClass,
        showCancelButton: true,
        confirmButtonText: "Next",
        cancelButtonText: "Cancel",
        focusConfirm: false,
        preConfirm: () => {
          const fuel = CustomSwal.getPopup().querySelector('#fuelType')?.value;
          if (!fuel) {
            CustomSwal.showValidationMessage("Select type");
            return false;
          }
          return fuel;
        },
      });

      if (fuelResult.isDismissed) {
        wizardFormStateRef.current = { name: "", type: "", units: "", fuelType: null, consumption: null };
        return;
      }

      const isElectric = fuelResult.value === "electric";

      const unitsResult = await CustomSwal.fire({
        title: "Measurement units",
        html: `
          <div style="text-align: left;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Select unit</label>
            <select id="units" class="my-select" style="width: 100%; padding: 0.5rem; border: 1px solid #585233; border-radius: 4px; margin-bottom: 1rem;">
              ${isElectric ? `
                <option value="kWh/100km" ${wizardFormStateRef.current.units === "kWh/100km" || !wizardFormStateRef.current.units ? "selected" : ""}>kWh/100km</option>
                <option value="km/kWh" ${wizardFormStateRef.current.units === "km/kWh" ? "selected" : ""}>km/kWh</option>
              ` : `
                <option value="L/100km" ${wizardFormStateRef.current.units === "L/100km" || !wizardFormStateRef.current.units ? "selected" : ""}>L/100km</option>
                <option value="km/l" ${wizardFormStateRef.current.units === "km/l" ? "selected" : ""}>km/l</option>
              `}
            </select>
            
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Consumption</label>
            <input type="number" id="consumption" class="my-input" value="${wizardFormStateRef.current.consumption ?? ""}" min="0" step="0.1" style="width: 100%; box-sizing: border-box;" />
          </div>
        `,
        background: "#CCD5B9",
        color: "#585233",
        customClass,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Save",
        denyButtonText: "Back",
        cancelButtonText: "Cancel",
        focusConfirm: false,
        didOpen: () => {
          CustomSwal.getPopup().querySelector('#consumption')?.focus();
        },
        preConfirm: () => {
          const units = CustomSwal.getPopup().querySelector('#units')?.value;
          const consumption = parseFloat(CustomSwal.getPopup().querySelector('#consumption')?.value || "0");

          if (!units) {
            CustomSwal.showValidationMessage("Select unit");
            return false;
          }
          if (!consumption || consumption <= 0) {
            CustomSwal.showValidationMessage("Consumption must be greater than 0");
            return false;
          }
          return { units, consumption };
        },
      });

      if (unitsResult.isDenied) {
        const currentUnits = CustomSwal.getPopup().querySelector('#units')?.value;
        const currentConsumption = parseFloat(CustomSwal.getPopup().querySelector('#consumption')?.value || "0");
        wizardFormStateRef.current.units = currentUnits || wizardFormStateRef.current.units;
        wizardFormStateRef.current.consumption = currentConsumption || wizardFormStateRef.current.consumption;
        return handleAddClick();
      }

      if (!unitsResult.value) {
        wizardFormStateRef.current = { name: "", type: "", units: "", fuelType: null, consumption: null };
        return;
      }

      wizardFormStateRef.current.fuelType = fuelResult.value;
      wizardFormStateRef.current.type = isElectric ? "electricCar" : "fuelCar";

      await addVehicle(
        wizardFormStateRef.current.type,
        wizardFormStateRef.current.name,
        unitsResult.value.units,
        wizardFormStateRef.current.fuelType,
        unitsResult.value.consumption
      );

      wizardFormStateRef.current = { name: "", type: "", units: "", fuelType: null, consumption: null };
    }
  };

  const handleDelete = async (id) => {
    const result = await CustomSwal.fire({
      title: "Are you sure?",
      text: `You are about to delete "${id}". This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      background: "#E0E6D5",
      color: "#585233",
      customClass: {
        actions: "mone-swal-actions",
        confirmButton: "my-confirm-btn",
        cancelButton: "my-cancel-btn"
      }
    });

    // solo si confirma borramos
    if (result.isConfirmed) {
      await deleteVehicle(id);

      // mensaje de OK
      await CustomSwal.fire({
        title: "Deleted!",
        text: `"${id}" has been removed successfully.`,
        icon: "success",
      });
    }
  };

  const handleEdit = (vehicleName) => {
    const vehicle = vehicles.find(v => v.name === vehicleName);
    if (!vehicle) return;
    
    const normalized = normalizeConsumptionShape(vehicle.consumption);
    setEditingVehicle(vehicle);
    setEditForm({
      name: vehicle.name || "",
      fuelType: vehicle.fuelType || "",
      consumption: normalized?.amount?.toString() || ""
    });
  };

  const handleCancelEdit = () => {
    setEditingVehicle(null);
    setEditForm({ name: "", fuelType: "", consumption: "" });
  };

  const handleSaveEdit = async () => {
    if (!editingVehicle) return;
    
    const updates = {
      name: editForm.name,
      fuelType: editForm.fuelType || editingVehicle.fuelType,
      consumption: {
        amount: parseFloat(editForm.consumption) || 0,
        unit: editingVehicle.consumption?.unit || "kcal/min"
      }
    };

    await updateVehicle(editingVehicle.name, updates);
    handleCancelEdit();
  };

  const capitalize = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  const normalizeConsumptionShape = (consumption) => {
    if (!consumption) return null;

    if (typeof consumption.amount === "number") {
      return {
        amount: consumption.amount,
        unit: consumption.unit,
      };
    }

    if (
      consumption.amount &&
      typeof consumption.amount.amount === "number"
    ) {
      return {
        amount: consumption.amount.amount,
        unit: consumption.amount.unit || consumption.unit,
      };
    }

    if (typeof consumption === "number") {
      return { amount: consumption, unit: "" };
    }

    return null;
  };

  const convertConsumptionValue = (value, fromUnit, toUnit) => {
    if (value == null || Number.isNaN(value)) return null;
    if (!fromUnit || !toUnit || fromUnit === toUnit) return value;

    const ratioUnits = [
      ["L/100km", "km/l"],
      ["kWh/100km", "km/kWh"],
    ];
    //si alguna de las unidades pasadas se puede convertir
    const isConvertible = ratioUnits.some(
      ([a, b]) =>
        (fromUnit === a && toUnit === b) || (fromUnit === b && toUnit === a)
    );
    console.log("isConvertible:", isConvertible, "desde: ", fromUnit, " hasta: ", toUnit);

    if (!isConvertible || value === 0) return value;

    return 100 / value;
  };

  const formatConsumptionDisplay = (vehicle) => {
    const normalized = normalizeConsumptionShape(vehicle?.consumption);
    if (!normalized || normalized.amount == null || !normalized.unit) return "";

    const type = vehicle?.type?.toLowerCase();
    let targetUnit = normalized.unit;

    if (type === "fuelcar") {
      targetUnit = unitPreference.fuel;
    } else if (type === "electriccar") {
      targetUnit = unitPreference.electric;
    }

    const convertedValue = convertConsumptionValue(
      normalized.amount,
      normalized.unit,
      targetUnit
    );

    //Nan, not a number
    if (convertedValue == null || Number.isNaN(convertedValue)) return "";

    const rounded = convertedValue === Infinity || convertedValue === -Infinity
      ? "∞"
      : convertedValue.toFixed(2);

    return `${rounded} ${targetUnit}`.trim();
  };


  const renderList = (list) => {
    if (loading) return <li className="item-card item-card--empty">Loading...</li>;
    if (!list.length) return <li className="item-card item-card--empty">No items found</li>;

    return list.map((v) => {
      const isEditing = editingVehicle?.name === v.name;
      
      if (isEditing) {
        return (
          <li key={v.id || v.name} className="item-card item-card--editing">
            <div className="edit-form">
              <h3 className="edit-form__title">Edit {capitalize(v.type)}</h3>
              
              <div className="edit-form__field">
                <label className="edit-form__label">{capitalize(v.type)} Name</label>
                <input
                  type="text"
                  className="edit-form__input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  placeholder="Enter name"
                />
              </div>

              {v.type === "FuelCar" && (
                <div className="edit-form__field">
                  <label className="edit-form__label">Fuel Type</label>
                  <select
                    className="edit-form__select"
                    value={editForm.fuelType}
                    onChange={(e) => setEditForm({...editForm, fuelType: e.target.value})}
                  >
                    <option value="gasoline">Gasoline</option>
                    <option value="diesel">Diesel</option>
                  </select>
                </div>
              )}

              <div className="edit-form__field">
                <label className="edit-form__label">
                  Average {v.type === "Bike" || v.type === "Walking" ? "calories" : ""} consumption
                </label>
                <div className="edit-form__input-group">
                  <input
                    type="number"
                    className="edit-form__input"
                    value={editForm.consumption}
                    onChange={(e) => setEditForm({...editForm, consumption: e.target.value})}
                    placeholder="Enter consumption"
                    step="0.1"
                    min="0"
                  />
                  <span className="edit-form__unit">
                    {v.consumption?.unit || "kcal/min"}
                  </span>
                </div>
              </div>

              <div className="edit-form__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveEdit}
                >
                  Save changes
                </button>
              </div>
            </div>
          </li>
        );
      }

      return (
        <li key={v.id || v.name} className="item-card">
          <div className="item-card__icon" aria-hidden>
            <img src={getVehicleImage(v)} className="item-icon" alt="vehicle" />
          </div>

          <div className="item-card__content">
        <div className="item-card__title" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span>{v.name}</span>
              <FavoriteToggle
                active={Boolean(v.favorite || v.isFavorite)}
                onToggle={() => setFavorite(v.name, !(v.favorite || v.isFavorite))}
                label="Toggle favorite vehicle"
              />
            </div>
            <div className="item-card__meta">
              {v.fuelType ? `${capitalize(v.fuelType)} • ` : ""}
              {formatConsumptionDisplay(v)}
            </div>
          </div>

          <EditDeleteActions
            id={v.name}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </li>
      );
    });
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">My Mobility Methods</h1>

        <button
          className="btn btn-primary btn-add"
          onClick={handleAddClick}
          disabled={loading}
        >
          <svg className="add-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d={PLUS_ICON_PATH} />
          </svg>
          Add Mobility Method
        </button>
      </div>

      <div className="toolbar" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
        <input
          className="search-bar"
          type="search"
          placeholder="Search mobility methods by name, type, or fuel..."
          aria-label="Search mobility methods"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />


      </div>

      {error && <div className="error-banner">{error}</div>}

      <section className="list-section">
        <h2 className="section-title">Bikes</h2>
        <ul className="item-list">{renderList(bikes)}</ul>
      </section>

      <section className="list-section">
        <h2 className="section-title">Walking</h2>
        <ul className="item-list">{renderList(walkings)}</ul>
      </section>

      <section className="list-section">
        <h2 className="section-title">Vehicles</h2>
        <ul className="item-list">{renderList(regularVehicles)}</ul>
      </section>
    </div>
  );

}

