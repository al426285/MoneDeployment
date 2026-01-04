import { describe, test, expect, beforeAll, beforeEach, afterAll, afterEach } from "vitest";
import { PlaceService } from "../../../src/domain/service/PlaceService";
import { UserService } from "../../../src/domain/service/UserService";
import { UserSession } from "../../../src/domain/session/UserSession";
import { collection, deleteDoc, getDocs } from "firebase/firestore";
import { db, auth } from "../../../src/core/config/firebaseConfig";

const LONG_TIMEOUT = 20000;
const BASE_USER = {
	email: "al123456@uji.es",
	nickname: "Maria",
	password: "MiContrasena64",
};

const userService = UserService.getInstance();
const placeService = PlaceService.getInstance();

const createLocalStorage = () => {
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
	// Si no hay usuario autenticado en Firebase (por ejemplo, tras logOut en H09-E3),
	// evitamos disparar operaciones que Firebase rechazará con "Missing or insufficient permissions".
	if (!auth?.currentUser) return;
	const snapshot = await getDocs(userPlacesCollection());
	await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
};

beforeAll(async () => {
	createLocalStorage();
	await ensureBaseUser();
	await ensureSession();
	await cleanupUserPlaces();
});

beforeEach(async () => {
	createLocalStorage();
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

});

describe("Tests aceptación segunda iteración {h08}: Gestión de lugares guardados", () => {
	test(
		"H08-E1 - Válido: topónimo Morella genera coordenadas y se guarda",
		async () => {
			const query = "Morella Castellon Spain";
			const [suggestion] = await placeService.suggestToponyms(query, 1);
			expect(suggestion).toBeDefined();
			expect(suggestion.label).toContain("Morella");
			expect(suggestion.latitude).toBeCloseTo(40.62, 2);
			expect(Math.abs(suggestion.longitude)).toBeCloseTo(0.1, 2);

			await placeService.savePlace({
				name: suggestion.label,
				latitude: suggestion.latitude,
				longitude: suggestion.longitude,
				toponymicAddress: suggestion.label,
			});

			const places = await placeService.getSavedPlaces();
			expect(places.length).toBe(1);
			expect(places[0].name).toBe(suggestion.label);
			expect(places[0].latitude).toBeCloseTo(suggestion.latitude, 2);
			expect(Math.abs(places[0].longitude)).toBeCloseTo(Math.abs(suggestion.longitude), 2);
			expect(places[0].toponymicAddress).toBe(suggestion.label);
		},
		LONG_TIMEOUT
	);

	test(
		"H08-E2 - Inválido: topónimo repetido lanza PlaceAlreadySavedException",
		async () => {
			const query = "Morella Castellon Spain";
			const [suggestion] = await placeService.suggestToponyms(query, 1);
			if (!suggestion) throw new Error("No se pudo recuperar el topónimo real para Morella");
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
			expect(places[0].name).toBe(suggestion.label);
		},
		LONG_TIMEOUT
	);
});

describe("Tests aceptación segunda iteración {h09}: Consulta de lugares", () => {
  test("H09-E1 - Válido: consultar los lugares exitosamente con lugares guardados", async () => {
	await placeService.savePlace({
				name: "Casa",
				latitude: 40.620,
				longitude: -0.098,
			});
	const places = await placeService.getSavedPlaces();
	expect(places.length).toBe(1);
	expect(places[0].name).toBe("Casa");
	expect(places[0].latitude).toBeCloseTo(40.620, 3);
	expect(places[0].longitude).toBeCloseTo(-0.098, 2);
  },
		LONG_TIMEOUT
	);
  test("H09-E2 - Válido: consultar los lugares exitosamente sin lugares guardados", async () => {
	const places=await placeService.getSavedPlaces();
	expect(places.length).toBe(0);
  },
		LONG_TIMEOUT
	);

  test("H09-E3 - Inválido: consultar lugares con la sesión cerrada", async () => {
	await userService.logOut();
	await expect(placeService.getSavedPlaces())
	  .rejects.toThrow("SessionNotFoundException");
  },
		LONG_TIMEOUT
	);
});

describe("Tests aceptación segunda iteración {h10}: Eliminación de lugares", () => {
  test("H010-E1 - Válido: Eliminar el lugar con nombre Casa", async () => {
	await placeService.savePlace({
				name: "Casa",
				latitude: 40.620,
				longitude: -0.098,
			});
	await placeService.deletePlaceByName("Casa");
	const places = await placeService.getSavedPlaces();
	await expect(places.length).toBe(0);
  },
		LONG_TIMEOUT
	);

  test("H10-E2 - Inválido: Eliminar el lugar no guardado con nombre Caza", async () => {
	await placeService.savePlace({
				name: "Casa",
				latitude: 40.620,
				longitude: -0.098,
			});
	
	await expect(placeService.deletePlaceByName("Caza"))
	  .rejects.toThrow("PlaceNotDeletedException");
	const places=await placeService.getSavedPlaces;
	await expect(places.length).toBe(1);
  },
		LONG_TIMEOUT
	);
});

describe("Tests aceptación segunda iteración {h11}: Edición de lugares", () => {
  test("H11-E1 - Válido: Cambiar el nombre del lugar con topónimo Morella a Ma casa", async () => {
	const query = "Morella Castellon Spain";
	const [suggestion] = await placeService.suggestToponyms(query, 1);
	if (!suggestion) throw new Error("No se pudo recuperar el topónimo real para Morella");

	await placeService.savePlace({
		name: suggestion.label,
		latitude: suggestion.latitude,
		longitude: suggestion.longitude,
		toponymicAddress: suggestion.label,
	});

	await placeService.editPlaceByToponym(suggestion.label, "Ma casa");

	const places =await placeService.getSavedPlaces();
	expect(places[0].name).toBe("Ma casa");

  },
		LONG_TIMEOUT
	);

  test("H11-E3 - Inválido: Cambiar el nombre del lugar no guardado con topónimo Moncofa a Ma casa", async () => {
		
	await expect(placeService.editPlaceByToponym("Moncofa", "Ma casa"))
	  .rejects.toThrow("PlaceNotSavedException");

  },
		LONG_TIMEOUT
	);
});