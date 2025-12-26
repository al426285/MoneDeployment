import { describe, test, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import { RouteService } from "../../../src/domain/service/RouteService";
import { OpenRouteServiceAdapter } from "../../../src/data/provider/OpenRouteServiceAdapter";
import { OpenRouteServiceHttpClient } from "../../../src/data/provider/OpenRouteServiceHttpClient";
import { UserService } from "../../../src/domain/service/UserService";
import { VehicleService } from "../../../src/domain/service/VehicleService";
const userService = UserService.getInstance();
const vehicleService = VehicleService.getInstance();

const resetRouteServiceSingleton = () => {
	// @ts-ignore
	RouteService.instance = null;
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

beforeAll(async () => {
    // Crear usuario de prueba e iniciar sesión
    try {
       // await userService.signUp("al123456@uji.es", "Maria", "MiContrasena64");
        await userService.logIn("al123456@uji.es", "MiContrasena64");
		await vehicleService.registerVehicle("al123456@uji.es", "fuelCar", "Fiat Punto", "gasoline", 4.5);
		await vehicleService.registerVehicle("al123456@uji.es", "electricCar", "Terreneitor", undefined, 20);
			
    } catch (error) {
        console.error("Error en beforeAll:", error);
    }

});

afterAll(async () => {
	// Crear usuario de prueba e iniciar sesión
    try {
		await vehicleService.deleteVehicle("al123456@uji.es", "Fiat Punto");
		await vehicleService.deleteVehicle("al123456@uji.es", "Terreneitor");
        await userService.logOut();			
    } catch (error) {
        console.error("Error en afterAll:", error);
    }
});

describe("HU15 - Editar los datos de un vehículo (nombre, tipo de combustible, consumo medio)", () => {
	test("E1 válido: poner combustible de Fiat Punto como diésel", async () => {
		await expect(
			vehicleService.editVehicle("al123456@uji.es", "Fiat Punto", { fuelType: "diesel" })
		).resolves.not.toThrow();
		await expect(
			vehicleService.getVehicles("al123456@uji.es")
		).resolves.toContainEqual(expect.objectContaining({ name: "Fiat Punto", fuelType: "diesel" }));
	});

	test("E2 inválido: poner combustible de Seat Ibiza (vehículo no guardado) como diésel", async () => {
		await expect(
			vehicleService.editVehicle("al123456@uji.es", "Seat Ibiza", { fuelType: "diesel" })
		).rejects.toThrow("VehicleNotFoundException");
		
	});

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
