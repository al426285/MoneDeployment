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

  // Estado inmediato y persistente del formulario (guardar contenido formulario para mostrar al hace back)
  const wizardFormStateRef = useRef({
    name: "",
    type: "",
    units: "",
    fuelType: "",
    consumption: "",
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
  const favorites = useMemo(() => filteredVehicles.filter((v) => Boolean(v.favorite || v.isFavorite)), [filteredVehicles]);
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
      input: "my-input",
      actions: "mone-swal-actions",
    };

    const step = await CustomSwal.fire({
      title: "Add Mobility Method",
      html: `
        <div class="wizard-form">
          <input
            type="text"
            id="addName"
            class="my-input"
            value="${wizardFormStateRef.current.name}"
            placeholder="Name"
          />

          <select id="addType" class="my-select" style="margin-top: 1rem;">
            <option value="" disabled ${!wizardFormStateRef.current.type ? "selected" : ""}>Select type</option>
            <option value="bike" ${wizardFormStateRef.current.type === "bike" ? "selected" : ""}>Bike</option>
            <option value="walking" ${wizardFormStateRef.current.type === "walking" ? "selected" : ""}>Walking</option>
            <option value="car" ${wizardFormStateRef.current.type === "car" ? "selected" : ""}>Vehicle</option>
          </select>

          <div id="carFields" style="display: ${wizardFormStateRef.current.type === "car" ? "block" : "none"}; margin-top: 1rem;">
            <select id="addFuelType" class="my-select">
              <option value="" disabled ${!wizardFormStateRef.current.fuelType ? "selected" : ""}>Select fuel type</option>
              <option value="electric" ${wizardFormStateRef.current.fuelType === "electric" ? "selected" : ""}>Electric</option>
              <option value="gasoline" ${wizardFormStateRef.current.fuelType === "gasoline" ? "selected" : ""}>Gasoline</option>
              <option value="diesel" ${wizardFormStateRef.current.fuelType === "diesel" ? "selected" : ""}>Diesel</option>
            </select>

            <select id="addUnits" class="my-select" style="margin-top: 1rem;"></select>
          </div>

          <div class="wizard-form__input-group" style="margin-top: 1rem;">
            <input
              type="number"
              id="addConsumption"
              class="my-input"
              value="${wizardFormStateRef.current.consumption}"
              min="0"
              step="0.1"
              placeholder="Consumption"
            />
            <span id="consumptionUnit" style="margin-left: 0.5rem;"></span>
          </div>
        </div>
      `,
      background: "#CCD5B9",
      color: "#585233",
      customClass,
      showCancelButton: true,
      confirmButtonText: "Save",
      cancelButtonText: "Cancel",
      focusConfirm: false,
      didOpen: () => {
        const popup = CustomSwal.getPopup();
        const typeSelect = popup.querySelector('#addType');
        const fuelSelect = popup.querySelector('#addFuelType');
        const unitsSelect = popup.querySelector('#addUnits');
        const consumptionInput = popup.querySelector('#addConsumption');
        const consumptionUnit = popup.querySelector('#consumptionUnit');
        const carFields = popup.querySelector('#carFields');

        const updateUnitsOptions = () => {
          const fuelType = fuelSelect.value;
          const options = fuelType === 'electric'
            ? ['kWh/100km', 'km/kWh']
            : ['L/100km', 'km/l'];
          unitsSelect.innerHTML = options
            .map((unit) => `<option value="${unit}" ${wizardFormStateRef.current.units === unit ? 'selected' : ''}>${unit}</option>`)
            .join('');
        };

        const updateConsumptionCopy = () => {
          const typeValue = typeSelect.value;
          if (typeValue === 'bike' || typeValue === 'walking') {
            consumptionInput.placeholder = 'Average calories consumption (kcal/min)';
            consumptionInput.setAttribute('aria-label', 'Average calories consumption (kcal/min)');
            consumptionUnit.textContent = 'kcal/min';
          } else if (typeValue === 'car') {
            consumptionInput.placeholder = 'Consumption';
            consumptionInput.setAttribute('aria-label', 'Consumption');
            consumptionUnit.textContent = unitsSelect.value || '';
          } else {
            consumptionInput.placeholder = 'Consumption';
            consumptionInput.setAttribute('aria-label', 'Consumption');
            consumptionUnit.textContent = '';
          }
        };

        const handleTypeChange = () => {
          const typeValue = typeSelect.value;
          carFields.style.display = typeValue === 'car' ? 'block' : 'none';
          updateConsumptionCopy();
        };

        const handleFuelChange = () => {
          updateUnitsOptions();
          updateConsumptionCopy();
        };

        // initialize units select content before maybe hidden
        updateUnitsOptions();
        updateConsumptionCopy();

        typeSelect.addEventListener('change', handleTypeChange);
        fuelSelect.addEventListener('change', handleFuelChange);
        unitsSelect.addEventListener('change', updateConsumptionCopy);
        popup.querySelector('#addName')?.focus();
      },
      preConfirm: () => {
        const popup = CustomSwal.getPopup();
        const name = popup.querySelector('#addName')?.value.trim() || "";
        const type = popup.querySelector('#addType')?.value || "";
        const fuelType = popup.querySelector('#addFuelType')?.value || "";
        const units = popup.querySelector('#addUnits')?.value || "";
        const consumptionValue = parseFloat(popup.querySelector('#addConsumption')?.value || "0");

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
        if (!consumptionValue || consumptionValue <= 0) {
          CustomSwal.showValidationMessage("Consumption must be greater than 0");
          return false;
        }

        if (type === "car") {
          if (!fuelType) {
            CustomSwal.showValidationMessage("Fuel type is required for vehicles");
            return false;
          }
          if (!units) {
            CustomSwal.showValidationMessage("Measurement unit is required");
            return false;
          }
        }

        return { name, type, fuelType, units, consumptionValue };
      },
    });

    if (!step.value) {
      wizardFormStateRef.current = { name: "", type: "", units: "", fuelType: "", consumption: "" };
      return;
    }

    wizardFormStateRef.current = {
      name: step.value.name,
      type: step.value.type,
      units: step.value.units,
      fuelType: step.value.fuelType,
      consumption: step.value.consumptionValue,
    };

    if (step.value.type === "bike" || step.value.type === "walking") {
      await addVehicle(step.value.type, step.value.name, "", null, step.value.consumptionValue);
    } else if (step.value.type === "car") {
      const derivedType = step.value.fuelType === "electric" ? "electricCar" : "fuelCar";
      await addVehicle(
        derivedType,
        step.value.name,
        step.value.units,
        step.value.fuelType,
        step.value.consumptionValue
      );
    }

    wizardFormStateRef.current = { name: "", type: "", units: "", fuelType: "", consumption: "" };
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

  const handleEdit = async (vehicleName) => {
    const vehicle = vehicles.find((v) => v.name === vehicleName);
    if (!vehicle) return;

    const normalized = normalizeConsumptionShape(vehicle.consumption);
    const currentConsumption = normalized?.amount ?? "";
    const consumptionUnit = normalized?.unit || (vehicle.type === "Bike" || vehicle.type === "Walking" ? "kcal/min" : "");
    const isBikeOrWalking = vehicle.type === "Bike" || vehicle.type === "Walking";
    const isFuelCar = vehicle.type === "FuelCar";
    const consumptionPlaceholder = isBikeOrWalking ? "Average calories consumption" : "Consumption";

    const customClass = {
      confirmButton: "my-confirm-btn",
      cancelButton: "my-cancel-btn",
      input: "my-input",
      actions: "mone-swal-actions",
    };

    const result = await CustomSwal.fire({
      title: `Edit ${vehicle.name}`,
      html: `
        <div class="wizard-form">
          <input
            type="text"
            id="editName"
            class="my-input"
            value="${vehicle.name || ""}"
            placeholder="${capitalize(vehicle.type)} name"
          />
          ${isFuelCar ? `
            <select id="editFuelType" class="my-select" style="margin-top: 1rem;">
              <option value="gasoline" ${vehicle.fuelType === "gasoline" ? "selected" : ""}>Gasoline</option>
              <option value="diesel" ${vehicle.fuelType === "diesel" ? "selected" : ""}>Diesel</option>
            </select>
          ` : ""}
          <div class="wizard-form__input-group" style="margin-top: 1rem;">
            <input
              type="number"
              id="editConsumption"
              class="my-input"
              value="${currentConsumption}"
              placeholder="${consumptionPlaceholder}"
              min="0"
              step="0.1"
            />
            <span id="editConsumptionUnit" style="margin-left: 0.5rem;">${consumptionUnit}</span>
          </div>
        </div>
      `,
      background: "#CCD5B9",
      color: "#585233",
      customClass,
      showCancelButton: true,
      confirmButtonText: "Save",
      cancelButtonText: "Cancel",
      focusConfirm: false,
      didOpen: () => {
        CustomSwal.getPopup().querySelector('#editName')?.focus();
      },
      preConfirm: () => {
        const popup = CustomSwal.getPopup();
        const name = popup.querySelector('#editName')?.value.trim() || "";
        const fuelType = isFuelCar ? popup.querySelector('#editFuelType')?.value : vehicle.fuelType;
        const consumptionValue = parseFloat(popup.querySelector('#editConsumption')?.value || "0");

        if (!name) {
          CustomSwal.showValidationMessage("Name is required");
          return false;
        }
        if (!isValidVehicleName(name)) {
          CustomSwal.showValidationMessage("Invalid name format");
          return false;
        }
        if (!consumptionValue || consumptionValue <= 0) {
          CustomSwal.showValidationMessage("Consumption must be greater than 0");
          return false;
        }

        if (isFuelCar && !fuelType) {
          CustomSwal.showValidationMessage("Fuel type is required");
          return false;
        }

        return { name, fuelType, consumptionValue };
      },
    });

    if (!result.value) return;

    const wasFavorite = Boolean(vehicle.favorite || vehicle.isFavorite);

    await updateVehicle(vehicle.name, {
      name: result.value.name,
      fuelType: result.value.fuelType || vehicle.fuelType,
      consumption: {
        amount: result.value.consumptionValue,
        unit: consumptionUnit || vehicle.consumption?.unit || "kcal/min",
      },
      favorite: wasFavorite,
      isFavorite: wasFavorite,
    });

    if (wasFavorite) {
      const targetName = result.value.name || vehicle.name;
      setFavorite(targetName, true);
    }
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


  const renderList = (list, emptyMessage = "No items found") => {
    if (loading) return <li className="item-card item-card--empty">Loading...</li>;
    if (!list.length) return <li className="item-card item-card--empty">{emptyMessage}</li>;

    return list.map((v) => {
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
        <h2 className="section-title">Favorites</h2>
        <ul className="item-list">
          {renderList(
            favorites,
            searchTerm.trim() ? "No favorites match your search" : "No favorites yet"
          )}
        </ul>
      </section>

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

