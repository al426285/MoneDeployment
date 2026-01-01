import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { UserService } from "../../../src/domain/service/UserService";
import { UserSession } from "../../../src/domain/session/UserSession";
import { VehicleService } from "../../../src/domain/service/VehicleService";

const USER_EMAIL = "al123456@uji.es";
const USER_PASSWORD = "MiContrasena64";
const VEHICLE_NAME = "Fiat Punto";
const HOOK_TIMEOUT = 45_000;
const userService = UserService.getInstance();
let userId = USER_EMAIL;

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
	if (typeof globalThis.navigator !== "undefined") return;
	setNavigatorStatus(true);
};

const loginUser = async () => {
	const session = await userService.logIn(USER_EMAIL, USER_PASSWORD);
	userId = session.userId;
	return session;
};

const getVehicleService = () => {
	return VehicleService.getInstance();
};

const clearUserVehicles = async (service: VehicleService, ownerId: string) => {
	const vehicles = await service.getVehicles(ownerId);
	await Promise.all(vehicles.map((vehicle) => service.deleteVehicle(ownerId, vehicle.name)));
};

const seedVehicle = async (service: VehicleService, favorite: boolean) => {
	await service.registerVehicle(userId, "fuelCar", VEHICLE_NAME, "gasoline", 4.5);
	if (favorite) {
		await service.setFavorite(userId, VEHICLE_NAME, true);
	}
};

describe("Pruebas aceptación favoritos", () => {
	beforeAll(() => {
		ensureLocalStorage();
		ensureNavigator();
	}, HOOK_TIMEOUT);

	beforeEach(async () => {
		localStorage.clear();
		UserSession.clear();
		await loginUser();
		const service = getVehicleService();
		await clearUserVehicles(service, userId);
	}, HOOK_TIMEOUT);

	afterAll(async () => {
		try {
			await userService.logOut();
		} finally {
			UserSession.clear();
		}
	}, HOOK_TIMEOUT);

	describe("HU23 - marcar favoritos", () => {
		it("HU23 E1: marca un vehículo como favorito", async () => {
			const service = getVehicleService();
			await seedVehicle(service, false);

			await service.setFavorite(userId, VEHICLE_NAME, true);

			const vehicles = await service.getVehicles(userId);
			const fiat = vehicles.find((vehicle) => vehicle.name === VEHICLE_NAME);
			expect(fiat).toBeDefined();
			expect(fiat?.favorite).toBe(true);
		});
	});

	describe("HU27 - desmarcar favoritos", () => {
		it("HU27 E1: desmarca un vehículo como favorito ", async () => {
			const service = getVehicleService();
			await seedVehicle(service, true);

			await service.setFavorite(userId, VEHICLE_NAME, false);

			const vehicles = await service.getVehicles(userId);
			const fiat = vehicles.find((vehicle) => vehicle.name === VEHICLE_NAME);
			expect(fiat).toBeDefined();
			expect(fiat?.favorite).toBe(false);
		});

		it("HU27 E6: falla si la base de datos no está disponible", async () => {
			const service = getVehicleService();
			await seedVehicle(service, true);

			setNavigatorStatus(false);
			try {
				await expect(service.setFavorite(userId, VEHICLE_NAME, false)).rejects.toThrow(
					"DatabaseNotAvailableException"
				);
			} finally {
				setNavigatorStatus(true);
			}

			const vehicles = await service.getVehicles(userId);
			const fiat = vehicles.find((vehicle) => vehicle.name === VEHICLE_NAME);
			expect(fiat).toBeDefined();
			expect(fiat?.favorite).toBe(true);
		});
	});
});
