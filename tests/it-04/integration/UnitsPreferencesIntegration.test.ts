import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { UserPreferencesService } from "../../../src/domain/service/UserPreferencesService";

const { docMock, getDocMock, setDocMock } = vi.hoisted(() => {
	return {
		docMock: vi.fn(),
		getDocMock: vi.fn(),
		setDocMock: vi.fn(),
	};
});

vi.mock("firebase/firestore", async () => {
	const actual = await vi.importActual<typeof import("firebase/firestore")>("firebase/firestore");
	return {
		...actual,
		doc: docMock,
		getDoc: getDocMock,
		setDoc: setDocMock,
	};
});

vi.mock("../../../src/core/config/firebaseConfig", () => ({
	db: {},
}));

const createSnapshot = (preferences?: Record<string, unknown>) => ({
	exists: () => Boolean(preferences),
	data: () => ({ preferences }),
});

describe("HU24 - Preferencias de unidades (integración)", () => {
	const USER_ID = "al123456@uji.es";
	let service: UserPreferencesService;

	beforeEach(() => {
		docMock.mockReset();
		docMock.mockImplementation((_db, collection, id) => ({ collection, id }));
		getDocMock.mockReset();
		setDocMock.mockReset();
		setDocMock.mockResolvedValue(undefined);
		service = new UserPreferencesService();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	test("E1 - Válido: establece km como unidad de distancia", async () => {
		getDocMock
			.mockResolvedValueOnce(
				createSnapshot({ distanceUnit: "", combustionConsumptionUnit: "l/100km", electricConsumptionUnit: "kwh/100km" })
			)
			.mockResolvedValueOnce(
				createSnapshot({ distanceUnit: "km", combustionConsumptionUnit: "l/100km", electricConsumptionUnit: "kwh/100km" })
			);

		await service.save(USER_ID, { distanceUnit: "km" });

		expect(setDocMock).toHaveBeenCalledWith(
			expect.objectContaining({ collection: "users", id: USER_ID }),
			{
				preferences: {
					distanceUnit: "km",
					combustionConsumptionUnit: "l/100km",
					electricConsumptionUnit: "kwh/100km",
				},
			},
			{ merge: true }
		);

		const finalPrefs = await service.get(USER_ID);
		expect(finalPrefs.distanceUnit).toBe("km");
		expect(finalPrefs.combustionConsumptionUnit).toBe("l/100km");
		expect(finalPrefs.electricConsumptionUnit).toBe("kwh/100km");
	});

	test("E2 - Inválido: rechaza unidad de distancia no soportada", async () => {
		await expect(service.save(USER_ID, { distanceUnit: "cm" as any })).rejects.toThrow(
			"InvalidDataException"
		);
		expect(getDocMock).not.toHaveBeenCalled();
		expect(setDocMock).not.toHaveBeenCalled();
	});
});
