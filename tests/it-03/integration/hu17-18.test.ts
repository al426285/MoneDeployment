import { describe, test, expect } from "vitest";
import { RouteFacade } from "../../../src/domain/service/RouteFacade";
import type { RouteRequestOptions } from "../../../src/domain/service/RouteService";
import type { RouteService } from "../../../src/domain/service/RouteService";
import type { UserPreferences, UserPreferencesService } from "../../../src/domain/service/UserPreferencesService";
import type { CostEstimatorGateway, PriceSnapshot } from "../../../src/domain/decorators/Cost/CostEstimatorDecorator";
import type { IRouteData } from "../../../src/domain/model/IRouteData";
import { Route, type RouteProps } from "../../../src/domain/model/Route";

const BASE_ORIGIN = "40.620, -0.098";
const BASE_DESTINATION = "39.933, -0.355";
const USER_ID = "al123456@uji.es";
const STEPS_SAMPLE = ["N-232", "CV-132", "CV-10", "CV-20", "CV-223"];

const DEFAULT_PREFS: UserPreferences = {
  distanceUnit: "km",
  combustionConsumptionUnit: "l/100km",
  electricConsumptionUnit: "kwh/100km",
};

const createRoute = (overrides: Partial<RouteProps> = {}): IRouteData =>
  new Route({
    origin: BASE_ORIGIN,
    destination: BASE_DESTINATION,
    distanceMeters: 150_000,
    durationMinutes: 120,
    mobilityType: "vehicle",
    routeType: "shortest",
    steps: STEPS_SAMPLE,
    consumptionPer100Km: 4.5,
    consumptionUnit: "l/100km",
    cost: 0,
    currency: "EUR",
    polyline: [
      [40.62, -0.098],
      [39.933, -0.355],
    ],
    ...overrides,
  });

const createRouteServiceStub = (config: { route?: IRouteData; error?: Error }): RouteService =>
  ({
    async requestRoute() {
      if (config.error) throw config.error;
      if (!config.route) throw new Error("RouteNotConfigured");
      return config.route;
    },
    async saveRoute() {
      return "route-id";
    },
    async listSavedRoutes() {
      return [];
    },
    async deleteSavedRoute() {
      return;
    },
  }) as unknown as RouteService;

const createPreferencesServiceStub = (overrides: Partial<UserPreferences> = {}): UserPreferencesService =>
  ({
    async get() {
      return { ...DEFAULT_PREFS, ...overrides };
    },
    async save() {
      return;
    },
  }) as unknown as UserPreferencesService;

const createCostGatewayStub = (options: { snapshot?: PriceSnapshot; error?: Error } = {}): CostEstimatorGateway => ({
  async getLatestPrices() {
    if (options.error) throw options.error;
    if (!options.snapshot) throw new Error("CostSnapshotUnavailable");
    return options.snapshot;
  },
});

describe("HU17 - Coste de rutas en vehículo", () => {
  const baseVehicleOptions: RouteRequestOptions & { userId: string } = {
    origin: BASE_ORIGIN,
    destination: BASE_DESTINATION,
    mobilityType: "vehicle",
    routeType: "shortest",
    userId: USER_ID,
    fuelType: "gasoline",
    estimatedConsumption: { value: 4.5, unit: "l/100km" },
  };

  test("H17-E1 - Válido: calcula el coste de la ruta guardada usando el precio de la gasolina", async () => {
    const priceSnapshot: PriceSnapshot = {
      currency: "EUR",
      gasolinePerLiter: 1.5,
      timestamp: Date.now(),
    };

    const facade = new RouteFacade({
      service: createRouteServiceStub({ route: createRoute() }),
      preferencesService: createPreferencesServiceStub(),
      costGateway: createCostGatewayStub({ snapshot: priceSnapshot }),
    });

    const response = await facade.requestRoute(baseVehicleOptions);

    expect(response.route.cost).toBeCloseTo(10.125, 2);
    expect(response.route.currency).toBe("EUR");
    expect(response.baseRoute.cost).toBeCloseTo(10.125, 2);
    expect(response.route.steps).toEqual(STEPS_SAMPLE);
    expect(response.priceSnapshot?.gasolinePerLiter).toBe(1.5);
  });

  test("H17-E5 - Inválido: sin APIs geográficas disponibles lanza ApiNotAvailableException", async () => {
    const routeError = new Error("ApiNotAvailableException");

    const facade = new RouteFacade({
      service: createRouteServiceStub({ error: routeError }),
      preferencesService: createPreferencesServiceStub(),
      costGateway: createCostGatewayStub({
        snapshot: {
          currency: "EUR",
          gasolinePerLiter: 1.5,
          timestamp: Date.now(),
        },
      }),
    });

    await expect(facade.requestRoute(baseVehicleOptions)).rejects.toThrow("ApiNotAvailableException");
  });
});

describe("HU18 - Coste calórico de rutas a pie o en bici", () => {
  const walkingOptions: RouteRequestOptions & { userId: string } = {
    origin: BASE_ORIGIN,
    destination: BASE_DESTINATION,
    mobilityType: "walking",
    routeType: "shortest",
    userId: USER_ID,
  };

  test("H18-E1 - Válido: muestra el coste calórico de una ruta guardada", async () => {
    const walkingRoute = createRoute({
      mobilityType: "walking",
      distanceMeters: 165_000,
      durationMinutes: 1_500,
      cost: 9_200,
      currency: "kcal",
      consumptionPer100Km: null,
      consumptionUnit: "kcal/min",
    });

    const facade = new RouteFacade({
      service: createRouteServiceStub({ route: walkingRoute }),
      preferencesService: createPreferencesServiceStub(),
      costGateway: createCostGatewayStub({ error: new Error("ApiNotAvailableException") }),
    });

    const response = await facade.requestRoute(walkingOptions);

    expect(response.baseRoute.distance).toBeGreaterThanOrEqual(100_000);
    expect(response.baseRoute.distance).toBeLessThanOrEqual(200_000);
    expect(response.route.cost).toBe(9_200);
    expect(response.route.currency).toBe("kcal");
    expect(response.route.steps).toEqual(STEPS_SAMPLE);
  });

  test("H18-E4 - Inválido: sin conexión con las APIs geográficas se lanza ApiNotAvailableException", async () => {
    const routeError = new Error("ApiNotAvailableException");

    const facade = new RouteFacade({
      service: createRouteServiceStub({ error: routeError }),
      preferencesService: createPreferencesServiceStub(),
      costGateway: createCostGatewayStub({ error: new Error("ApiNotAvailableException") }),
    });

    await expect(facade.requestRoute(walkingOptions)).rejects.toThrow("ApiNotAvailableException");
  });
});
