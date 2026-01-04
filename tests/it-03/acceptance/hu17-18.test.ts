import { describe, it, expect } from "vitest";
import { RouteFacade } from "../../../src/domain/service/RouteFacade";
import type { RouteRequestOptions, RouteService } from "../../../src/domain/service/RouteService";
import type { UserPreferences, UserPreferencesService } from "../../../src/domain/service/UserPreferencesService";
import type { CostEstimatorGateway, PriceSnapshot } from "../../../src/domain/decorators/Cost/CostEstimatorDecorator";
import type { IRouteData } from "../../../src/domain/model/IRouteData";
import { Route, type RouteProps } from "../../../src/domain/model/Route";

const REGISTERED_USER = {
  email: "al123456@uji.es",
  nickname: "Maria",
  password: "MiContrasena64",
};

const STEPS_SAMPLE = ["N-232", "CV-132", "CV-10", "CV-20", "CV-223"];

const DEFAULT_PREFS: UserPreferences = {
  distanceUnit: "km",
  combustionConsumptionUnit: "l/100km",
  electricConsumptionUnit: "kwh/100km",
};

const createRouteRecord = (props: Partial<RouteProps> = {}): IRouteData =>
  new Route({
    origin: "40.620, -0.098",
    destination: "39.933, -0.355",
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
    ...props,
  });

const createRouteServiceDouble = (config: { route?: IRouteData; error?: Error }): RouteService =>
  ({
    async requestRoute() {
      if (config.error) throw config.error;
      if (!config.route) throw new Error("RouteNotConfigured");
      return config.route;
    },
  }) as unknown as RouteService;

const createPreferencesServiceDouble = (overrides: Partial<UserPreferences> = {}): UserPreferencesService =>
  ({
    async get() {
      return { ...DEFAULT_PREFS, ...overrides };
    },
  }) as unknown as UserPreferencesService;

const createCostGatewayDouble = (options: { snapshot?: PriceSnapshot; error?: Error } = {}): CostEstimatorGateway => ({
  async getLatestPrices() {
    if (options.error) throw options.error;
    if (!options.snapshot) throw new Error("CostSnapshotUnavailable");
    return options.snapshot;
  },
});

const HU17_OPTIONS: RouteRequestOptions & { userId: string } = {
  origin: "40.620, -0.098",
  destination: "39.933, -0.355",
  mobilityType: "vehicle",
  routeType: "shortest",
  userId: REGISTERED_USER.email,
  fuelType: "gasoline",
  estimatedConsumption: { value: 4.5, unit: "l/100km" },
};

describe("HU17 - Coste económico de rutas en vehículo (aceptación)", () => {
  it("E1 - Válido: consulta coste de ruta más corta en Fiat Punto", async () => {
    // GIVEN
    const priceSnapshot: PriceSnapshot = {
      currency: "EUR",
      gasolinePerLiter: 1.5,
      timestamp: Date.now(),
    };
    const existingRoute = createRouteRecord();
    const facade = new RouteFacade({
      service: createRouteServiceDouble({ route: existingRoute }),
      preferencesService: createPreferencesServiceDouble(),
      costGateway: createCostGatewayDouble({ snapshot: priceSnapshot }),
    });

    // WHEN
    const response = await facade.requestRoute(HU17_OPTIONS);

    // THEN
    expect(response.route.routeType).toBe("shortest");
    expect(response.route.steps).toEqual(STEPS_SAMPLE);
    expect(response.priceSnapshot?.gasolinePerLiter).toBe(1.5);
    expect(response.route.cost).toBeCloseTo(10.125, 2);
    expect(response.baseRoute.cost).toBeCloseTo(10.125, 2);
  });

  it("E5 - Inválido: sin APIs geográficas disponibles lanza ApiNotAvailableException", async () => {
    // GIVEN
    const routeError = new Error("ApiNotAvailableException");
    const facade = new RouteFacade({
      service: createRouteServiceDouble({ error: routeError }),
      preferencesService: createPreferencesServiceDouble(),
      costGateway: createCostGatewayDouble({
        snapshot: {
          currency: "EUR",
          gasolinePerLiter: 1.5,
          timestamp: Date.now(),
        },
      }),
    });

    // WHEN / THEN
    await expect(facade.requestRoute(HU17_OPTIONS)).rejects.toThrow("ApiNotAvailableException");
  });
});

describe("HU18 - Coste calórico de rutas a pie (aceptación)", () => {
  const WALKING_OPTIONS: RouteRequestOptions & { userId: string } = {
    origin: "40.620, -0.098",
    destination: "39.933, -0.355",
    mobilityType: "walking",
    routeType: "shortest",
    userId: REGISTERED_USER.email,
  };

  it("E1 - Válido: consulta coste calórico de la ruta guardada 'paseito'", async () => {
    // GIVEN
    const walkingRoute = createRouteRecord({
      mobilityType: "walking",
      distanceMeters: 165_000,
      durationMinutes: 1_500,
      cost: 9_600,
      currency: "kcal",
      consumptionPer100Km: null,
      consumptionUnit: "kcal/min",
    });
    const facade = new RouteFacade({
      service: createRouteServiceDouble({ route: walkingRoute }),
      preferencesService: createPreferencesServiceDouble(),
      costGateway: createCostGatewayDouble({ error: new Error("PriceApiUnavailable") }),
    });

    // WHEN
    const response = await facade.requestRoute(WALKING_OPTIONS);

    // THEN
    expect(response.baseRoute.distance).toBeGreaterThanOrEqual(100_000);
    expect(response.baseRoute.distance).toBeLessThanOrEqual(200_000);
    expect(response.baseRoute.duration).toBeGreaterThanOrEqual(1_200);
    expect(response.baseRoute.duration).toBeLessThanOrEqual(2_100);
    expect(response.route.cost).toBeGreaterThanOrEqual(5_000);
    expect(response.route.cost).toBeLessThanOrEqual(15_000);
    expect(response.route.currency).toBe("kcal");
  });

  it("E4 - Inválido: sin conexión con las APIs geográficas se lanza ApiNotAvailableException", async () => {
    // GIVEN
    const routeError = new Error("ApiNotAvailableException");
    const facade = new RouteFacade({
      service: createRouteServiceDouble({ error: routeError }),
      preferencesService: createPreferencesServiceDouble(),
      costGateway: createCostGatewayDouble({ error: new Error("PriceApiUnavailable") }),
    });

    // WHEN / THEN
    await expect(facade.requestRoute(WALKING_OPTIONS)).rejects.toThrow("ApiNotAvailableException");
  });
});
