import React, { useMemo, useState } from "react";
import EditDeleteActions from "./EditDeleteActions";
import { VehicleViewModel } from "../../viewmodel/VehicleViewModel";
import Swal from "sweetalert2";
import { isValidVehicleName } from "../../core/utils/validators";
export default function VehiclesPage() {
  const {
    vehicles,
    loading,
    error,
    loadVehicles,
    addVehicle,
    deleteVehicle,
    getFuelUnitsPreference,
    getElectricUnitsPreference,
  } = VehicleViewModel();

  const [searchTerm, setSearchTerm] = useState("");

  //Preferencias de unidades, deberia de venir del viewmodel
  //seria = get....
  const [unitPreference, setUnitPreference] = useState({
    fuel: "L/100km", //getFuelUnitsPreference(),
    electric: "kWh/100km", //getElectricUnitsPreference()
  });

  const PLUS_ICON_PATH =
    "M12 2a1 1 0 0 1 1 1v8h8a1 1 0 1 1 0 2h-8v8a1 1 0 1 1-2 0v-8H3a1 1 0 1 1 0-2h8V3a1 1 0 0 1 1-1z";

  const filteredVehicles = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return vehicles;
    return vehicles.filter((vehicle) => {
      const nameMatch = vehicle.name?.toLowerCase().includes(normalized);
      const typeMatch = vehicle.type?.toLowerCase().includes(normalized);
      const fuelMatch = vehicle.fuelType
        ? vehicle.fuelType.toLowerCase().includes(normalized)
        : false;
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
    const formState = {
      name: "",
      type: "",
      units: "",
      fuelType: null,
      consumption: null,
    };

    const buildTypeOptions = () => `
      <option value="" disabled ${formState.type ? "" : "selected"}>Select vehicle type</option>
      <option value="bike" ${formState.type === "bike" ? "selected" : ""}>Bike</option>
      <option value="walking" ${formState.type === "walking" ? "selected" : ""}>Walking</option>
      <option value="fuelCar" ${formState.type === "fuelCar" ? "selected" : ""}>Fuel Car</option>
      <option value="electricCar" ${formState.type === "electricCar" ? "selected" : ""}>Electric Car</option>
    `;

    const buildFuelOptions = () => `
      <option value="" disabled ${formState.fuelType ? "" : "selected"}>Select fuel type</option>
      <option value="gasoline" ${formState.fuelType === "gasoline" ? "selected" : ""}>Gasoline</option>
      <option value="diesel" ${formState.fuelType === "diesel" ? "selected" : ""}>Diesel</option>
    `;

    const buildUnitOptions = () => {
      if (formState.type === "electricCar") {
        return `
          <option value="" disabled ${formState.units ? "" : "selected"}>Select measurement unit</option>
          <option value="km/kWh" ${formState.units === "km/kWh" ? "selected" : ""}>km/kWh</option>
          <option value="kWh/100km" ${formState.units === "kWh/100km" ? "selected" : ""}>kWh/100km</option>
        `;
      }

      if (formState.type === "fuelCar") {
        return `
          <option value="" disabled ${formState.units ? "" : "selected"}>Select measurement unit</option>
          <option value="km/l" ${formState.units === "km/l" ? "selected" : ""}>km/l</option>
          <option value="L/100km" ${formState.units === "L/100km" ? "selected" : ""}>L/100km</option>
        `;
      }

      return "";
    };

    const customClass = {
      confirmButton: "my-confirm-btn",
      cancelButton: "my-cancel-btn",
      denyButton: "my-back-btn",
      input: "my-input",
    };

    let step = "name";

    while (true) {
      if (step === "name") {
        const nameResult = await Swal.fire({
          title: "Vehicle name",
          input: "text",
          inputValue: formState.name,
          inputPlaceholder: "Enter vehicle name",
          showCancelButton: true,
          confirmButtonText: "Next",
          cancelButtonText: "Cancel",
          background: "#CCD5B9",
          color: "#585233",
          customClass,
          inputValidator: (value) => {
            if (!value) return "You need to write something!";
            if (!isValidVehicleName(value)) return "Invalid name format, cannot contain special characters or letter 'ñ'.";
            return null;
          },
        });

        if (nameResult.isDismissed) return;
        formState.name = nameResult.value;
        step = "type";
        continue;
      }

      if (step === "type") {
        const typeResult = await Swal.fire({
          title: "Vehicle type",
          html: `
            <select id="vehicleType" class="my-select">
              ${buildTypeOptions()}
            </select>
          `,
          background: "#CCD5B9",
          color: "#585233",
          customClass,
          showCancelButton: true,
          showDenyButton: true,
          denyButtonText: "Back",
          confirmButtonText: "Next",
          focusConfirm: false,
          preConfirm: () => {
            const select = Swal.getPopup().querySelector('#vehicleType');
            const value = select?.value;
            if (!value) {
              Swal.showValidationMessage("You must select a type");
              return;
            }
            return value;
          },
        });

        if (typeResult.isDenied) {
          step = "name";
          continue;
        }
        if (typeResult.isDismissed) return;

        formState.type = typeResult.value;
        formState.units = "";
        formState.fuelType =
          formState.type === "fuelCar"
            ? formState.fuelType
            : formState.type === "electricCar"
              ? "electric"
              : null;
        step = formState.type === "fuelCar"
          ? "fuelType"
          : formState.type === "electricCar"
            ? "units"
            : "consumption";
        continue;
      }

      if (step === "fuelType") {
        const fuelResult = await Swal.fire({
          title: "Fuel Type",
          html: `
            <select id="fuelType" class="my-select">
              ${buildFuelOptions()}
            </select>
          `,
          background: "#CCD5B9",
          color: "#585233",
          customClass,
          showCancelButton: true,
          showDenyButton: true,
          denyButtonText: "Back",
          confirmButtonText: "Next",
          focusConfirm: false,
          preConfirm: () => {
            const select = Swal.getPopup().querySelector('#fuelType');
            const value = select?.value;
            if (!value) {
              Swal.showValidationMessage("Select a fuel type");
              return;
            }
            return value;
          },
        });

        if (fuelResult.isDenied) {
          step = "type";
          continue;
        }
        if (fuelResult.isDismissed) return;

        formState.fuelType = fuelResult.value;
        step = "units";
        continue;
      }

      if (step === "units") {
        const unitsResult = await Swal.fire({
          title: "Measurement units",
          html: `
            <select id="consumptionUnits" class="my-select">
              ${buildUnitOptions()}
            </select>
          `,
          background: "#CCD5B9",
          color: "#585233",
          customClass,
          showCancelButton: true,
          showDenyButton: true,
          denyButtonText: "Back",
          confirmButtonText: "Next",
          focusConfirm: false,
          preConfirm: () => {
            const select = Swal.getPopup().querySelector('#consumptionUnits');
            const value = select?.value;
            if (!value) {
              Swal.showValidationMessage("Select a measurement unit");
              return;
            }
            return value;
          },
        });

        if (unitsResult.isDenied) {
          step = formState.type === "fuelCar" ? "fuelType" : "type";
          continue;
        }
        if (unitsResult.isDismissed) return;

        formState.units = unitsResult.value;
        step = "consumption";
        continue;
      }

      if (step === "consumption") {
        const unitLabel =
          formState.type === "fuelCar" || formState.type === "electricCar"
            ? formState.units || (formState.type === "fuelCar" ? "L/100km" : "kWh/100km")
            : "Kcal/min";

        const consumptionResult = await Swal.fire({
          title: `Consumption (${unitLabel})`,
          input: "number",
          inputValue: formState.consumption ?? "",
          inputPlaceholder: "Enter consumption",
          inputAttributes: { min: "0", step: "0.1" },
          showCancelButton: true,
          showDenyButton: true,
          denyButtonText: "Back",
          confirmButtonText: "Save",
          background: "#CCD5B9",
          color: "#585233",
          customClass,
          preConfirm: (value) => {
            if (!value) {
              Swal.showValidationMessage("Consumption is required");
              return;
            }
            const numeric = parseFloat(value);
            if (Number.isNaN(numeric) || numeric <= 0) {
              Swal.showValidationMessage("Consumption must be greater than 0");
              return;
            }
            return numeric;
          },
        });

        if (consumptionResult.isDenied) {
          step = formState.type === "fuelCar" ? "fuelType" : "type";
          continue;
        }
        if (consumptionResult.isDismissed) return;

        formState.consumption = consumptionResult.value;
        break;
      }
    }

    await addVehicle(
      formState.type,
      formState.name,
      formState.units || "",
      formState.fuelType,
      formState.consumption ?? undefined
    );
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete "${id}". This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      background: "#E0E6D5",
      color: "#585233",
      customClass: {
        confirmButton: "my-confirm-btn",
        cancelButton: "my-cancel-btn"
      }
    });

    // solo si confirma borramos
    if (result.isConfirmed) {
      await deleteVehicle(id);

      // mensaje de OK
      await Swal.fire({
        title: "Deleted!",
        text: `"${id}" has been removed successfully.`,
        icon: "success",
        background: "#E0E6D5",
        color: "#585233",
        customClass: {
          confirmButton: "my-confirm-btn",
        }
      });
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


  const renderList = (list) => {
    if (loading) return <li className="item-card item-card--empty">Loading...</li>;
    if (!list.length) return <li className="item-card item-card--empty">No items found</li>;

    //  console.log("Rendering list:", list[0].constructor.name);


    return list.map((v) => (
      <li key={v.id} className="item-card">
        <div className="item-card__icon" aria-hidden>
          <img src={getVehicleImage(v)}
            className="item-icon" alt="bici" />

        </div>

        <div className="item-card__content">
          <div className="item-card__title">{v.name}</div>
          <div className="item-card__meta">

            {v.fuelType ? `${capitalize(v.fuelType)} • ` : ""}

            {formatConsumptionDisplay(v)}
          </div>
        </div>

        <EditDeleteActions
          id={v.name}
          editTarget={"/edit-vehicle"}
          onDelete={handleDelete}
        />
      </li>
    ));
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
