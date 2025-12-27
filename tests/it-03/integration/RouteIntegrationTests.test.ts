import { describe, test, expect, beforeEach, vi } from "vitest";
import { RouteService } from "../../../src/domain/service/RouteService";
import { OpenRouteServiceAdapter } from "../../../src/data/provider/OpenRouteServiceAdapter";
import { OpenRouteServiceHttpClient } from "../../../src/data/provider/OpenRouteServiceHttpClient";
import { UserSession } from "../../../src/domain/session/UserSession";

const resetRouteServiceSingleton = () => {

  (RouteService as any).instance = null;
};

const BASE_ORIGIN = "40.620, -0.098"; // Casa / Morella
const BASE_DEST = "39.933, -0.355"; // Pico Espadán
const stepsSample = ["N-232", "CV-132", "CV-10", "CV-20", "CV-223"];

const mockORSResponseForRoute = (distanceMeters: number, durationSeconds: number, coords: Array<[number, number]>, steps: string[]) => {
  return {
    ok: true,
    headers: { get: () => "application/json" },
    json: async () => ({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            segments: [
              {
                distance: distanceMeters,
                duration: durationSeconds,
                steps: steps.map((s) => ({ instruction: s })),
              },
            ],
          },
          geometry: {
            type: "LineString",
            // ORS returns [lng, lat]
            coordinates: coords.map(([lat, lng]) => [lng, lat]),
          },
        },
      ],
    }),
  } as unknown;
};

describe("Integration: RouteService + OpenRouteServiceAdapter (mocked ORS)", () => {
  beforeEach(() => {
    resetRouteServiceSingleton();
    vi.restoreAllMocks();
  });

  test("E1 valid: fastest Casa -> Pico Espadán", async () => {
    const fetchSpy = vi.spyOn(globalThis as any, "fetch").mockResolvedValue(
      mockORSResponseForRoute(150_000, 120 * 60, [[40.62, -0.098], [39.933, -0.355]], stepsSample)
    );

    const provider = new OpenRouteServiceAdapter(new OpenRouteServiceHttpClient());
    const service = RouteService.getInstance({ provider });

    const route = await service.requestRoute({
      origin: BASE_ORIGIN,
      destination: BASE_DEST,
      mobilityType: "vehicle",
      routeType: "fastest",
    });

    expect(route.getDistance()).toBeGreaterThanOrEqual(100_000);
    expect(route.getDistance()).toBeLessThanOrEqual(200_000);
    expect(route.getDuration()).toBeGreaterThanOrEqual(90);
    expect(route.getDuration()).toBeLessThanOrEqual(150);
    expect(route.getMobilityType()).toBe("vehicle");
    expect(route.getRouteType()).toBe("fastest");
    expect(route.getSteps()).toEqual(stepsSample);
    expect(route.getPolyline()).toHaveLength(2);

    fetchSpy.mockRestore();
  });

  test("E2 valid: shortest Casa -> Pico Espadán", async () => {
    const fetchSpy = vi.spyOn(globalThis as any, "fetch").mockResolvedValue(
      mockORSResponseForRoute(120_000, 100 * 60, [[40.62, -0.098], [39.933, -0.355]], stepsSample)
    );

    const provider = new OpenRouteServiceAdapter(new OpenRouteServiceHttpClient());
    const service = RouteService.getInstance({ provider });

    const route = await service.requestRoute({
      origin: BASE_ORIGIN,
      destination: BASE_DEST,
      mobilityType: "vehicle",
      routeType: "shortest",
    });

    expect(route.getRouteType()).toBe("shortest");
    expect(route.getMobilityType()).toBe("vehicle");
    expect(route.getDistance()).toBeGreaterThanOrEqual(100_000);
    expect(route.getDistance()).toBeLessThanOrEqual(200_000);
    expect(route.getDuration()).toBeGreaterThanOrEqual(90);
    expect(route.getDuration()).toBeLessThanOrEqual(150);

    fetchSpy.mockRestore();
  });

  test("E3 valid: shortest coord->coord without saved places", async () => {
    const fetchSpy = vi.spyOn(globalThis as any, "fetch").mockResolvedValue(
      mockORSResponseForRoute(130_000, 110 * 60, [[40.62, -0.098], [39.933, -0.355]], stepsSample)
    );

    const provider = new OpenRouteServiceAdapter(new OpenRouteServiceHttpClient());
    const service = RouteService.getInstance({ provider });

    const route = await service.requestRoute({
      origin: BASE_ORIGIN,
      destination: BASE_DEST,
      mobilityType: "vehicle",
      routeType: "shortest",
    });

    expect(route.getPolyline()).toHaveLength(2);
    expect(route.getSteps()).toEqual(stepsSample);

    fetchSpy.mockRestore();
  });

  test("E4 invalid: out of range coordinates -> InvalidDataException", async () => {
    const provider = new OpenRouteServiceAdapter(new OpenRouteServiceHttpClient());
    const service = RouteService.getInstance({ provider });

    await expect(
      service.requestRoute({
        origin: "40.620, -0.098",
        destination: "91, -0.355", // invalid latitude
        mobilityType: "vehicle",
        routeType: "shortest",
      })
    ).rejects.toThrow("InvalidDataException");
  });

  test("E5 save route: valid session saves with repository", async () => {
    const fetchSpy = vi.spyOn(globalThis as any, "fetch").mockResolvedValue(
      mockORSResponseForRoute(75_000, 55 * 60, [[39.98627, -0.004778], [39.477, -0.376]], stepsSample)
    );

    const saveRouteMock = vi.fn().mockResolvedValue("route-id-1");
    const repository = {
      saveRoute: saveRouteMock,
      listRoutes: vi.fn(),
      deleteRoute: vi.fn(),
    } as any;

    const provider = new OpenRouteServiceAdapter(new OpenRouteServiceHttpClient());
    const service = RouteService.getInstance({ provider, repository });

    await service.requestRoute({
      origin: BASE_ORIGIN,
      destination: BASE_DEST,
      mobilityType: "vehicle",
      routeType: "fastest",
    });

    const savedId = await service.saveRoute({
      origin: BASE_ORIGIN,
      destination: BASE_DEST,
      mobilityType: "vehicle",
      routeType: "fastest",
      name: "Castellón-Valencia",
      userId: "al123456@uji.es",
    });

    expect(savedId).toBe("route-id-1");
    expect(saveRouteMock).toHaveBeenCalledWith("al123456@uji.es", {
      name: "Castellón-Valencia",
      origin: BASE_ORIGIN,
      destination: BASE_DEST,
      mobilityType: "vehicle",
      mobilityMethod: "vehicle",
      routeType: "fastest",
    });

    fetchSpy.mockRestore();
  });

  test("E6 save route: session missing rejects", async () => {
    vi.spyOn(UserSession, "loadFromCache").mockReturnValue(null as any);
    const fetchSpy = vi.spyOn(globalThis as any, "fetch").mockResolvedValue(
      mockORSResponseForRoute(75_000, 55 * 60, [[39.98627, -0.004778], [39.477, -0.376]], stepsSample)
    );

    const saveRouteMock = vi.fn();
    const repository = {
      saveRoute: saveRouteMock,
      listRoutes: vi.fn(),
      deleteRoute: vi.fn(),
    } as any;

    const provider = new OpenRouteServiceAdapter(new OpenRouteServiceHttpClient());
    const service = RouteService.getInstance({ provider, repository });

    await service.requestRoute({
      origin: BASE_ORIGIN,
      destination: BASE_DEST,
      mobilityType: "vehicle",
      routeType: "fastest",
    });

    await expect(
      service.saveRoute({
        origin: BASE_ORIGIN,
        destination: BASE_DEST,
        mobilityType: "vehicle",
        routeType: "fastest",
        name: "Castellón-Valencia",
      })
    ).rejects.toThrow("User session not found. Provide a user id or ensure the session is cached.");

    expect(saveRouteMock).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
