import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RouteService } from "../../../src/domain/service/RouteService";
import { UserSession } from "../../../src/domain/session/UserSession";
import { UserService } from "../../../src/domain/service/UserService";

const USER_EMAIL = "al123456@uji.es";
const USER_PASSWORD = "MiContrasena64";
const userService = UserService.getInstance();
let userId = USER_EMAIL;

const ensureLocalStorage = () => {
	if (typeof globalThis.localStorage !== "undefined") return;
	const store = new Map<string, string>();
	globalThis.localStorage = {
		getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
		setItem: (key: string, value: string) => { store.set(key, value); },
		removeItem: (key: string) => { store.delete(key); },
		clear: () => { store.clear(); },
		key: (index: number) => Array.from(store.keys())[index] ?? null,
		get length() { return store.size; },
	} as unknown as Storage;
};

const loginUser = async () => {
	const session = await userService.logIn(USER_EMAIL, USER_PASSWORD);
	userId = session.userId;
	return session;
};

const clearUserRoutes = async (service: RouteService, userId: string) => {
	const routes = await service.listSavedRoutes(userId);
	await Promise.all(routes.map((r) => service.deleteSavedRoute(r.id as string, userId)));
};

describe("HU20/HU21/HU22 aceptación ", () => {
	beforeAll(() => {
		ensureLocalStorage();
	});

	beforeEach(async () => {
		UserSession.clear();
		await loginUser();
		// reset singleton
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		RouteService.instance = null;
		const service = RouteService.getInstance();
		await clearUserRoutes(service, userId);
	});

	afterAll(async () => {
		try {
			await userService.logOut();
		} finally {
			UserSession.clear();
		}
	});

	it("HU20 E1: lista rutas existentes (repo real)", async () => {
		const service = RouteService.getInstance();
		const routeId = await service.saveRoute({
			name: "Castellón-Valencia",
			origin: "39.98627,-0.004778",
			destination: "39.477,-0.376",
			mobilityType: "vehicle",
			routeType: "fastest",
			userId,
		});

		const routes = await service.listSavedRoutes(userId);

		expect(routes.some((r) => r.id === routeId)).toBe(true);
	});

	it("HU20 E2: lista vacía cuando no hay rutas (repo real)", async () => {
		const service = RouteService.getInstance();
		await clearUserRoutes(service, userId);

		const routes = await service.listSavedRoutes(userId);

		expect(routes).toEqual([]);
	});

	it("HU21 E1: elimina ruta existente (repo real)", async () => {
		const service = RouteService.getInstance();
		await clearUserRoutes(service, userId);
		const r1 = await service.saveRoute({
			name: "Castellón-Valencia",
			origin: "39.98627,-0.004778",
			destination: "39.477,-0.376",
			mobilityType: "vehicle",
			routeType: "fastest",
			userId,
		});
		const r2 = await service.saveRoute({
			name: "Madrid-Toledo",
			origin: "40.4168,-3.7038",
			destination: "39.8628,-4.0273",
			mobilityType: "vehicle",
			routeType: "shortest",
			userId,
		});

		await service.deleteSavedRoute(r2, userId);
		const remaining = await service.listSavedRoutes(userId);

		expect(remaining.find((r) => r.id === r2)).toBeUndefined();
		expect(remaining.find((r) => r.id === r1)).toBeDefined();
	});

	it("HU21 E2: eliminar ruta inexistente lanza RouteNotFoundException", async () => {
		const service = RouteService.getInstance();
		await clearUserRoutes(service, userId);
		const existingRouteId = await service.saveRoute({
			name: "Castellón-Valencia",
			origin: "39.98627,-0.004778",
			destination: "39.477,-0.376",
			mobilityType: "vehicle",
			routeType: "fastest",
			userId,
		});

		await expect(service.deleteSavedRoute("Madrid-Toledo", userId)).rejects.toThrowError("RouteNotFoundException");

		const remaining = await service.listSavedRoutes(userId);
		expect(remaining).toHaveLength(1);
		expect(remaining.find((r) => r.id === existingRouteId)).toBeDefined();
	});

	it("HU22 E1: edita ruta existente con datos válidos (repo real)", async () => {
		const service = RouteService.getInstance();
		await clearUserRoutes(service, userId);
		const routeId = await service.saveRoute({
			name: "Castellón-Valencia",
			origin: "39.98627,-0.004778",
			destination: "39.477,-0.376",
			mobilityType: "vehicle",
			routeType: "fastest",
			userId,
		});

		await service.updateSavedRoute(routeId, {
			name: "Castellón-Valencia barato",
			origin: "39.98627,-0.004778",
			destination: "39.477,-0.376",
			mobilityType: "vehicle",
			mobilityMethod: "vehicle",
			routeType: "cheapest",
		}, userId);

		const routes = await service.listSavedRoutes(userId);
		const updated = routes.find((r) => r.id === routeId);
		expect(updated?.name).toBe("Castellón-Valencia barato");
		expect(updated?.routeType).toBe("cheapest");
	});

	it("HU22 E3: editar ruta inexistente lanza RouteNotFoundException (repo real)", async () => {
		const service = RouteService.getInstance();
		await clearUserRoutes(service, userId);

		await expect(
			service.updateSavedRoute("no-such-route", {
				name: "Al infierno",
				origin: "39.98627,-0.004778",
				destination: "39.477,-0.376",
				mobilityType: "vehicle",
				mobilityMethod: "vehicle",
				routeType: "fastest",
			}, userId)
		).rejects.toThrowError("RouteNotFoundException");
	});


});

