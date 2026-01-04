import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RouteService } from "../../../src/domain/service/RouteService";
import { OpenRouteServiceAdapter } from "../../../src/data/provider/OpenRouteServiceAdapter";
import { OpenRouteServiceHttpClient } from "../../../src/data/provider/OpenRouteServiceHttpClient";
import { UserService } from "../../../src/domain/service/UserService";
import { VehicleService } from "../../../src/domain/service/VehicleService";
import { UserSession } from "../../../src/domain/session/UserSession";

const USER_EMAIL = "al123456@uji.es";
const USER_PASSWORD = "MiContrasena64";
const userService = UserService.getInstance();
const vehicleService = VehicleService.getInstance();

const ensureLocalStorage = () => {
	if (typeof globalThis.localStorage !== "undefined") return;
	const store = new Map<string, string>();
	globalThis.localStorage = {
		getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
		setItem: (key: string, value: string) => {
			store.set(key, value);
		},
		removeItem: (key: string) => {
			store.delete(key);
		},
		clear: () => {
			store.clear();
		},
		key: (index: number) => Array.from(store.keys())[index] ?? null,
		get length() {
			return store.size;
		},
	} as unknown as Storage;
};

const setNavigatorStatus = (online: boolean) => {
	Object.defineProperty(globalThis, "navigator", {
		value: { onLine: online } as Navigator,
		configurable: true,
	});
};

const ensureNavigator = () => {
	if (typeof globalThis.navigator === "undefined") {
		setNavigatorStatus(true);
	}
};

const resetRouteServiceSingleton = () => {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	RouteService.instance = null;
};

let authenticatedUserId = USER_EMAIL;

const loginUser = async () => {
	const session = await userService.logIn(USER_EMAIL, USER_PASSWORD);
	authenticatedUserId = session.userId;
	return session.userId;
};

const logoutUser = async () => {
	try {

		await userService.logOut();
	} catch { }

	finally {
		UserSession.clear();
	}
};

const clearUserVehicles = async (ownerId: string) => {
	const vehicles = await vehicleService.getVehicles(ownerId);
	await Promise.all(vehicles.map((vehicle) => vehicleService.deleteVehicle(ownerId, vehicle.name)));
};

const seedVehicles = async (ownerId: string) => {
	await clearUserVehicles(ownerId);
	await vehicleService.registerVehicle(ownerId, "fuelCar", "Fiat Punto", "gasoline", 4.5);
	await vehicleService.registerVehicle(ownerId, "electricCar", "Terreneitor", undefined, 20);
};

const CASTELLON_ORIGIN = "39.98627,-0.004778";
const VALENCIA_DEST = "39.477,-0.376";
const MADRID_ORIGIN = "40.4168,-3.7038";
const TOLEDO_DEST = "39.8628,-4.0273";

describe("HU15 - Editar datos de un vehículo (aceptación)", () => {
	beforeAll(() => {
		ensureLocalStorage();
		ensureNavigator();
	});

	beforeEach(async () => {
		UserSession.clear();
		await loginUser();
		await seedVehicles(authenticatedUserId);
	});

	afterAll(async () => {
		await clearUserVehicles(USER_EMAIL);
		await logoutUser();
	});

	it("E1 válido: el usuario actualiza el Fiat Punto a combustible diésel", async () => {
		await expect(
			vehicleService.editVehicle(authenticatedUserId, "Fiat Punto", { fuelType: "diesel" })
		).resolves.not.toThrow();

		const vehicles = await vehicleService.getVehicles(authenticatedUserId);
		expect(vehicles).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: "Fiat Punto", fuelType: "diesel" })])
		);
	});

	it("E2 inválido: intentar editar un vehículo que no existe lanza VehicleNotFoundException", async () => {
		await expect(
			vehicleService.editVehicle(authenticatedUserId, "Seat Ibiza", { fuelType: "diesel" })
		).rejects.toThrow("VehicleNotFoundException");
	});
});

describe("HU16 - Solicitud de rutas con el proveedor real", () => {
	beforeAll(() => {
		ensureLocalStorage();
		ensureNavigator();
	});

	beforeEach(() => {
		UserSession.clear();
		resetRouteServiceSingleton();
		setNavigatorStatus(true);
	});

	const serviceFactory = () => RouteService.getInstance({ provider: new OpenRouteServiceAdapter(new OpenRouteServiceHttpClient()) });

	it("E1 válido: obtiene la ruta más rápida Castellón -> Valencia", async () => {
		const service = serviceFactory();
		const route = await service.requestRoute({ origin: CASTELLON_ORIGIN, destination: VALENCIA_DEST, mobilityType: "vehicle", routeType: "fastest" });

		expect(route.getDistance()).toBeGreaterThan(0);
		expect(route.getDuration()).toBeGreaterThan(0);
		expect(route.getRouteType()).toBe("fastest");
		expect(route.getSteps().length).toBeGreaterThan(0);
	});

	it("E2 válido: obtiene la ruta más corta Castellón -> Valencia", async () => {
		const service = serviceFactory();
		const route = await service.requestRoute({ origin: CASTELLON_ORIGIN, destination: VALENCIA_DEST, mobilityType: "vehicle", routeType: "shortest" });

		expect(route.getDistance()).toBeGreaterThan(0);
		expect(route.getRouteType()).toBe("shortest");
		expect(route.getPolyline()?.length ?? 0).toBeGreaterThan(0);
	});

	it("E3 válido: coordena puntos sin lugares guardados y obtiene polilínea", async () => {
		const service = serviceFactory();
		const route = await service.requestRoute({ origin: MADRID_ORIGIN, destination: TOLEDO_DEST, mobilityType: "vehicle", routeType: "shortest" });

		expect(route.getSteps().length).toBeGreaterThan(0);
		expect(route.getPolyline()?.length ?? 0).toBeGreaterThan(0);
	});

	it("E4 inválido: coordenadas fuera de rango lanzan InvalidDataException antes de contactar al proveedor", async () => {
		const service = serviceFactory();
		await expect(
			service.requestRoute({ origin: CASTELLON_ORIGIN, destination: "91.000,-0.355", mobilityType: "vehicle", routeType: "shortest" })
		).rejects.toThrow("InvalidDataException");
	});
});

describe("HU19 - Guardar ruta calculada (aceptación)", () => {
	beforeAll(() => {
		ensureLocalStorage();
		ensureNavigator();
	});

	beforeEach(() => {
		UserSession.clear();
		resetRouteServiceSingleton();
		setNavigatorStatus(true);
	});

	afterAll(async () => {
		await logoutUser();
	});

	it("E1 válido: con sesión abierta se calcula y guarda la ruta Castellón-Valencia", async () => {
		const userId = await loginUser();
		const service = RouteService.getInstance({ provider: new OpenRouteServiceAdapter(new OpenRouteServiceHttpClient()) });

		await service.requestRoute({
			origin: "39.98627,-0.004778",
			destination: "39.477,-0.376",
			mobilityType: "vehicle",
			routeType: "fastest",
		});

		const routeId = await service.saveRoute({
			origin: "39.98627,-0.004778",
			destination: "39.477,-0.376",
			mobilityType: "vehicle",
			routeType: "fastest",
			name: "Castellón-Valencia",
			userId,
		});

		expect(routeId).toEqual(expect.any(String));

		await service.deleteSavedRoute(routeId, userId);
	});

	it("E3 inválido: sin sesión abierta guardar ruta lanza UserNotLoggedInException", async () => {
		await logoutUser();
		const service = RouteService.getInstance({ provider: new OpenRouteServiceAdapter(new OpenRouteServiceHttpClient()) });

		await service.requestRoute({
			origin: "39.98627,-0.004778",
			destination: "39.477,-0.376",
			mobilityType: "vehicle",
			routeType: "fastest",
		});

		await expect(
			service.saveRoute({
				origin: "39.98627,-0.004778",
				destination: "39.477,-0.376",
				mobilityType: "vehicle",
				routeType: "fastest",
				name: "Castellón-Valencia",
			})
		).rejects.toThrow("User session not found. Provide a user id or ensure the session is cached.");
	});
});
