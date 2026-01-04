import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { UserSession } from "../../../src/domain/session/UserSession";
import { UserService } from "../../../src/domain/service/UserService";
import { UserPreferencesService } from "../../../src/domain/service/UserPreferencesService";

const USER_EMAIL = "al123456@uji.es";
const USER_PASSWORD = "MiContrasena64";
const HOOK_TIMEOUT = 45_000;

const userService = UserService.getInstance();
const preferencesService = new UserPreferencesService();

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

describe("HU24 - Preferencias de unidades aceptación", () => {
	let userId: string;

	beforeAll(() => {
		ensureLocalStorage();
	}, HOOK_TIMEOUT);

	beforeEach(async () => {
		localStorage.clear();
		UserSession.clear();
		const session = await userService.logIn(USER_EMAIL, USER_PASSWORD);
		userId = session.userId;
		await preferencesService.save(userId, {
			distanceUnit: "km",
			combustionConsumptionUnit: "l/100km",
			electricConsumptionUnit: "kwh/100km",
			
		});
	}, HOOK_TIMEOUT);

	afterAll(async () => {
		try {
			await userService.logOut();
		} finally {
			UserSession.clear();
		}
	}, HOOK_TIMEOUT);

	it("HU26 E1: establece km como unidad de distancia ", async () => {
		await preferencesService.save(userId, { distanceUnit: "km" });

		const prefs = await preferencesService.get(userId);
		expect(prefs.distanceUnit).toBe("km");
		expect(prefs.combustionConsumptionUnit).toBe("l/100km");
	});

	it("HU26 E2: rechaza unidades inválidas para distancia", async () => {
		await expect(preferencesService.save(userId, { distanceUnit: "cm" as any })).rejects.toThrow(
			"InvalidDataException"
		);

		const prefs = await preferencesService.get(userId);
		expect(prefs.distanceUnit).toBe("km");
		expect(prefs.combustionConsumptionUnit).toBe("l/100km");
	});
});
