import { describe, test, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from "vitest";
import { PlaceService } from "../../../src/domain/service/PlaceService";
import { UserService } from "../../../src/domain/service/UserService";
import { UserSession } from "../../../src/domain/session/UserSession";
import { collection, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "../../../src/core/config/firebaseConfig";

const LONG_TIMEOUT = 20000;
const BASE_USER = {
	email: "al123456@uji.es",
	nickname: "Maria",
	password: "MiContrasena64",
};

const userService = UserService.getInstance();
const placeService = PlaceService.getInstance();

const createLocalStorageMock = () => {
	const store: Record<string, string> = {};
	global.localStorage = {
		getItem: (key: string) => (key in store ? store[key] : null),
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			Object.keys(store).forEach((key) => delete store[key]);
		},
		key: (index: number) => Object.keys(store)[index] || null,
		get length() {
			return Object.keys(store).length;
		},
	} as Storage;
};

let testUserId = "";

const ensureBaseUser = async () => {
	try {
		await userService.signUp(BASE_USER.email, BASE_USER.nickname, BASE_USER.password);
	} catch (error) {
		if (!(error instanceof Error) || error.message !== "EmailAlreadyInUse") {
			throw error;
		}
	}
};

const ensureSession = async () => {
	const session = await userService.logIn(BASE_USER.email, BASE_USER.password);
	testUserId = session.userId;
	return session;
};

const requireUserId = () => {
	if (!testUserId) {
		throw new Error("Test user not initialized");
	}
	return testUserId;
};

const userPlacesCollection = () => collection(db, "users", requireUserId(), "places");

const cleanupUserPlaces = async () => {
	if (!testUserId) return;
	const snapshot = await getDocs(userPlacesCollection());
	await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
};

const mockORSResponse = (label: string, latitude: number, longitude: number) =>
	vi.spyOn(globalThis, "fetch").mockResolvedValue({
		ok: true,
		headers: { get: () => "application/json" },
		json: async () => ({
			features: [
				{
					properties: { label, name: label, locality: label },
					geometry: { coordinates: [longitude, latitude] },
				},
			],
		}),
	} as any);

beforeAll(async () => {
	createLocalStorageMock();
	await ensureBaseUser();
	await ensureSession();
	await cleanupUserPlaces();
});

beforeEach(async () => {
	createLocalStorageMock();
	await ensureSession();
	await cleanupUserPlaces();
});

afterEach(async () => {
	await cleanupUserPlaces();
});

afterAll(async () => {
	await cleanupUserPlaces();
	try {
		await userService.logOut();
	} catch {
		/* ignore */
	}
});

describe("Tests aceptación segunda iteración {h07}: Guardar nuevo lugar", () => {
	test(
		"H07-E1 - Válido: coord. válidas registran Pico Espadán",
		async () => {
			const payload = {
				name: "Pico Espadán",
				latitude: 39.933,
				longitude: -0.355,
			};

			await placeService.savePlace(payload);
			const places = await placeService.getSavedPlaces();

			expect(Array.isArray(places)).toBe(true);
			expect(places.length).toBe(1);
			const stored = places[0];
			expect(stored).toBeDefined();
			expect(stored?.name).toBe("Pico Espadán");
			expect(stored?.latitude).toBeCloseTo(39.933, 3);
			expect(stored?.longitude).toBeCloseTo(-0.355, 3);
			const cachedSession = UserSession.loadFromCache();
			expect(cachedSession?.userId).toBe(testUserId);
		},
		LONG_TIMEOUT
	);

	test(
		"H07-E2 - Inválido: coordenadas ya registradas lanzan PlaceAlreadySavedException",
		async () => {
			await placeService.savePlace({
				name: "Pico Espadán",
				latitude: 39.933,
				longitude: -0.355,
			});

			await expect(
				placeService.savePlace({
					name: "Morella",
					latitude: 39.933,
					longitude: -0.355,
				})
			).rejects.toThrow("PlaceAlreadySavedException");

			const places = await placeService.getSavedPlaces();
			expect(places.length).toBe(1);
			expect(places[0].name).toBe("Pico Espadán");
		},
		LONG_TIMEOUT
	);

	test(
		"H07-E3 - Inválido: sin sesión activa ni userId explícito no permite guardar",
		async () => {
			UserSession.clear();

			await expect(
				placeService.savePlace({
					name: "Parque Ribalta",
					latitude: 39.989,
					longitude: -0.051,
				})
			).rejects.toThrow("User session not found. Provide an explicit user id or ensure the session is stored.");
		},
		LONG_TIMEOUT
	);
});

describe("Tests aceptación segunda iteración {h08}: Gestión de lugares guardados", () => {
	test(
		"H08-E1 - Válido: topónimo Morella genera coordenadas y se guarda",
		async () => {
			const fetchSpy = mockORSResponse("Morella", 40.62, -0.098);
			try {
				const [suggestion] = await placeService.suggestToponyms("Morella", 1);
				expect(suggestion.label).toBe("Morella");
				expect(suggestion.latitude).toBeCloseTo(40.62, 2);
				expect(suggestion.longitude).toBeCloseTo(-0.098, 3);

				await placeService.savePlace({
					name: suggestion.label,
					latitude: suggestion.latitude,
					longitude: suggestion.longitude,
					toponymicAddress: suggestion.label,
				});

				const places = await placeService.getSavedPlaces();
				expect(places.length).toBe(1);
				expect(places[0].name).toBe("Morella");
				expect(places[0].latitude).toBeCloseTo(40.62, 2);
				expect(places[0].toponymicAddress).toBe("Morella");
			} finally {
				fetchSpy.mockRestore();
			}
		},
		LONG_TIMEOUT
	);

	test(
		"H08-E2 - Inválido: topónimo repetido lanza PlaceAlreadySavedException",
		async () => {
			const fetchSpy = mockORSResponse("Morella", 40.62, -0.098);
			try {
				const [suggestion] = await placeService.suggestToponyms("Morella", 1);
				await placeService.savePlace({
					name: suggestion.label,
					latitude: suggestion.latitude,
					longitude: suggestion.longitude,
					toponymicAddress: suggestion.label,
					description: "Casa",
				});

				await expect(
					placeService.savePlace({
						name: suggestion.label,
						latitude: suggestion.latitude,
						longitude: suggestion.longitude,
						toponymicAddress: suggestion.label,
					})
				).rejects.toThrow("PlaceAlreadySavedException");

				const places = await placeService.getSavedPlaces();
				expect(places.length).toBe(1);
				expect(places[0].name).toBe("Morella");
			} finally {
				fetchSpy.mockRestore();
			}
		},
		LONG_TIMEOUT
	);
});
