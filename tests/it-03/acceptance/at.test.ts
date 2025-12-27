import { describe, test, expect, beforeEach, vi } from "vitest";
import { RouteService } from "../../../src/domain/service/RouteService";
import { OpenRouteServiceAdapter } from "../../../src/data/provider/OpenRouteServiceAdapter";
import { OpenRouteServiceHttpClient } from "../../../src/data/provider/OpenRouteServiceHttpClient";
import { UserService } from "../../../src/domain/service/UserService";
import { afterAll } from "vitest";

const BASE_USER = {
	email: "al123456@uji.es",
	nickname: "Maria",
	password: "MiContrasena64",
};

const resetRouteServiceSingleton = () => {
	// @ts-ignore
	RouteService.instance = null;
};
const userService = UserService.getInstance();
let testUserId = "";

const ensureSession = async () => {
	const session = await userService.logIn(BASE_USER.email, BASE_USER.password);
	testUserId = session.userId;
	return session;
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
	} as any;
};

afterAll(async () => {
	try {
		await userService.logOut();
	} catch {
		/* ignore */
	}
});

describe("HU16 - RouteService acceptance (real provider)", () => {
	beforeEach(() => {
		resetRouteServiceSingleton();
		vi.restoreAllMocks();
	});

	test("E1 válido: fastest Casa -> Pico Espadán usando adaptador real", async () => {
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

	test("E2 válido: shortest Casa -> Pico Espadán usando adaptador real", async () => {
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

	test("E3 válido: shortest coord->coord without saved places using adaptador real", async () => {
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

	test("E4 inválido: coordenadas fuera de rango lanzan InvalidDataException", async () => {
		const provider = new OpenRouteServiceAdapter(new OpenRouteServiceHttpClient());
		const service = RouteService.getInstance({ provider });

		await expect(
			service.requestRoute({
				origin: "40.620, -0.098",
				destination: "91, -0.355", // lat > 90 => inválido
				mobilityType: "vehicle",
				routeType: "shortest",
			})
		).rejects.toThrow("InvalidDataException");
	});
});

describe("HU19 - Guardar ruta (aceptación)", () => {
	beforeEach(() => {
		resetRouteServiceSingleton();
		vi.restoreAllMocks();
	});

	test("E1 válido: sesión abierta, ruta calculada y guardada", async () => {
		await ensureSession();
		const service = RouteService.getInstance();

		const route = await service.requestRoute({
			origin: "39.98627, -0.004778",
			destination: "39.477, -0.376",
			mobilityType: "vehicle",
			routeType: "fastest",
		});

		expect(route).toBeTruthy();

		const savedId = await service.saveRoute({
			origin: "39.98627, -0.004778",
			destination: "39.477, -0.376",
			mobilityType: "vehicle",
			routeType: "fastest",
			name: "Castellón-Valencia",
			userId: "al123456@uji.es",
		});

		expect(typeof savedId === "string" || savedId instanceof String).toBe(true);
	});

	test("E3 inválido: sesión cerrada lanza UserNotLoggedInException", async () => {
		const service = RouteService.getInstance();

		await service.requestRoute({
			origin: "39.98627, -0.004778",
			destination: "39.477, -0.376",
			mobilityType: "vehicle",
			routeType: "fastest",
		});

		await expect(
			service.saveRoute({
				origin: "39.98627, -0.004778",
				destination: "39.477, -0.376",
				mobilityType: "vehicle",
				routeType: "fastest",
				name: "Castellón-Valencia",
			})
		).rejects.toThrow("User session not found. Provide a user id or ensure the session is cached.");
	});
});
