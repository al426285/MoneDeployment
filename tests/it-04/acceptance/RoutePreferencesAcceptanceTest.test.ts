import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { UserSession } from "../../../src/domain/session/UserSession";
import { UserService } from "../../../src/domain/service/UserService";
import { UserDefaultOptionsService } from "../../../src/domain/service/UserDefaultOptionsService";
import { VehicleService } from "../../../src/domain/service/VehicleService";

const USER_EMAIL = "al123456@uji.es";
const USER_PASSWORD = "MiContrasena64";
const HOOK_TIMEOUT = 45_000;

const userService = UserService.getInstance();
const defaultOptionsService = new UserDefaultOptionsService();
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
	if (typeof globalThis.navigator !== "undefined") return;
	setNavigatorStatus(true);
};

const loginUser = async () => {
	const session = await userService.logIn(USER_EMAIL, USER_PASSWORD);
	return session;
};

const resetDefaultOptions = async (userId: string) => {
	await defaultOptionsService.save(userId, {
		transportMode: "vehicle",
		routeType: "fastest",
		vehicleName: null,
	});
};

const clearUserVehicles = async (ownerId: string) => {
	const vehicles = await vehicleService.getVehicles(ownerId);
	await Promise.all(vehicles.map((vehicle) => vehicleService.deleteVehicle(ownerId, vehicle.name)));
};

const seedDefaultVehicle = async (ownerId: string) => {
	await vehicleService.registerVehicle(ownerId, "fuelCar", "Mercedes", "gasoline", 8.5);
	await vehicleService.setFavorite(ownerId, "Mercedes", true);
};

describe("Aceptación preferencias de ruta", () => {
	let userId: string;

	beforeAll(() => {
		ensureLocalStorage();
		ensureNavigator();
	}, HOOK_TIMEOUT);

	beforeEach(async () => {
		localStorage.clear();
		UserSession.clear();
		setNavigatorStatus(true);
		const session = await loginUser();
		userId = session.userId;
		await resetDefaultOptions(userId);
		await clearUserVehicles(userId);
	}, HOOK_TIMEOUT);

	afterAll(async () => {
		try {
			await userService.logOut();
		} finally {
			UserSession.clear();
		}
	}, HOOK_TIMEOUT);

	describe("HU24 - Transporte por defecto", () => {
		it("E2: establece bicicleta como método por defecto", async () => {
			await defaultOptionsService.save(userId, {
				transportMode: "bike",
			});

			const options = await defaultOptionsService.get(userId);
			expect(options.transportMode).toBe("bike");
			expect(options.routeType).toBe("fastest");
			expect(options.vehicleName).toBeNull();
		});

		it("E3: rechaza un método inválido y conserva bicycle", async () => {
			await defaultOptionsService.save(userId, { transportMode: "bike" });

			await expect(
				defaultOptionsService.save(userId, {
					transportMode: "Autobús" as any,
				})
			).rejects.toThrow("MobilityTypeNotFoundException");

			const options = await defaultOptionsService.get(userId);
			expect(options.transportMode).toBe("bike");
			expect(options.routeType).toBe("fastest");
			expect(options.vehicleName).toBeNull();
		});
	});

	describe("HU25 - Tipo de ruta por defecto", () => {
		it("E1: establece 'fastest' como tipo de ruta", async () => {
			await defaultOptionsService.save(userId, { routeType: "fastest" });

			const options = await defaultOptionsService.get(userId);
			expect(options.routeType).toBe("fastest");
			expect(options.transportMode).toBe("vehicle");
		});

		it("E5: falla si la base de datos no está disponible", async () => {
			setNavigatorStatus(false);
			await expect(
				defaultOptionsService.save(userId, { routeType: "fastest" })
			).rejects.toThrow("DatabaseNotAvailableException");

			setNavigatorStatus(true);
			const options = await defaultOptionsService.get(userId);
			expect(options.routeType).toBe("fastest");
		});
	});

	describe("HU28 - Vehículo por defecto", () => {
		it("E1: usa un vehículo registrado y favorito", async () => {
			await seedDefaultVehicle(userId);

			await defaultOptionsService.save(userId, {
				transportMode: "vehicle",
				vehicleName: "Mercedes",
			});

			const options = await defaultOptionsService.get(userId);
			expect(options.vehicleName).toBe("Mercedes");
			expect(options.transportMode).toBe("vehicle");
		});

		it("E3: falla si el vehículo no existe para el usuario", async () => {
			await clearUserVehicles(userId);

			await expect(
				defaultOptionsService.save(userId, {
					transportMode: "vehicle",
					vehicleName: "Mercedes",
				})
			).rejects.toThrow("VehicleNotFoundException");

			const options = await defaultOptionsService.get(userId);
			expect(options.vehicleName).toBeNull();
		});
	});
});
