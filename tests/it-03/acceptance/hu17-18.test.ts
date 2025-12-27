import { describe, test, expect } from "vitest";
import { calculateRouteCost } from "../../../src/viewmodel/routeViewmodel";

describe("Acceptance – HU17 & HU18 Route cost calculation", () => {

  test("HU17 – Ruta en coche gasolina muestra el coste económico correcto", () => {
    const vehicle = {
      type: "fuelcar",
      fuelType: "gasoline",
      consumption: {
        amount: {
          amount: 5,
          unit: "l/100km",
        },
      },
    };

    const route = {
      distance: 150, // km
      duration: 120,
    };

    const priceSnapshot = {
      gasolinePerLiter: 1.5,
      dieselPerLiter: 1.4,
      currency: "EUR",
    };

    const result = calculateRouteCost(vehicle, route, priceSnapshot);

    // 150km → 7.5 litros → 11.25€
    expect(result?.replace(/\s/g, "")).toBe("11,25€");
  });

  test("HU17 – Ruta en coche eléctrico muestra el coste económico correcto", () => {
    const vehicle = {
      type: "electriccar",
      consumption: {
        amount: {
          amount: 18,
          unit: "kwh/100km",
        },
      },
    };

    const route = {
      distance: 200,
      duration: 150,
    };

    const priceSnapshot = {
      electricityPerKwh: 0.25,
      currency: "EUR",
    };

    const result = calculateRouteCost(vehicle, route, priceSnapshot);

    // 200km → 36 kWh → 9€
    expect(result?.replace(/\s/g, "")).toBe("9,00€");
  });

  test("HU18 – Ruta andando muestra el coste calórico", () => {
    const vehicle = {
      type: "walking",
      consumption: {
        amount: {
          amount: 5, // kcal/min
          unit: "kcal/min",
        },
      },
    };

    const route = {
      distance: 3,
      duration: 60,
    };

    const result = calculateRouteCost(vehicle, route, null);

    // 60 min * 5 kcal
    expect(result).toBe("300 kcal");
  });

  test("HU18 – Ruta en bici muestra el coste calórico", () => {
    const vehicle = {
      type: "bike",
      consumption: {
        amount: {
          amount: 8,
          unit: "kcal/min",
        },
      },
    };

    const route = {
      distance: 10,
      duration: 45,
    };

    const result = calculateRouteCost(vehicle, route, null);

    expect(result).toBe("360 kcal");
  });

});
