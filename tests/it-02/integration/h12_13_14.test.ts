import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import type { SpyInstance } from "vitest";
import { VehicleService } from "../../../src/domain/service/VehicleService";
import { UserSession } from "../../../src/domain/session/UserSession";
import type { Vehicle, FuelType } from "../../../src/domain/model/VehicleInterface";

type VehicleRepositoryMock = {
	getVehiclesByOwnerId: ReturnType<typeof vi.fn>;
	saveVehicle: ReturnType<typeof vi.fn>;
	deleteVehicle: ReturnType<typeof vi.fn>;
};

const buildVehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
	name: "Generic",
	type: "Bike",
	fuelType: null,
	consumption: { amount: 5, unit: "kcal/min" },
	favorite: false,
	isFavorite: false,
	mostrarInfo: vi.fn(),
	...overrides,
});

describe("H12-H14: Vehicles integration", () => {
	const OWNER_ID = "USER123";
	let repo: VehicleRepositoryMock;
	let service: VehicleService;
	let sessionSpy: SpyInstance;

	beforeEach(() => {
		repo = {
			getVehiclesByOwnerId: vi.fn(),
			saveVehicle: vi.fn(),
			deleteVehicle: vi.fn(),
		};

		service = new VehicleService(repo as any);

		sessionSpy = vi.spyOn(UserSession, "loadFromCache").mockReturnValue({
			userId: OWNER_ID,
			token: "TOKEN123",
		} as any);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("{H12} RegisterVehicle", () => {
		test("H12-E1 - Válido: registra un vehículo correctamente", async () => {
			repo.saveVehicle.mockResolvedValue(undefined);

			await service.registerVehicle(undefined, "fuelCar", "FiatPunto", "diesel", 4.2);

			expect(repo.saveVehicle).toHaveBeenCalledTimes(1);
			const [ownerId, vehicle] = repo.saveVehicle.mock.calls[0];

			expect(ownerId).toBe(OWNER_ID);
			expect(vehicle.name).toBe("FiatPunto");
			expect(vehicle.type).toBe("FuelCar");
			expect(vehicle.consumption.amount).toBeCloseTo(4.2);
		});

		test("H12-E2 - Inválido: rechaza consumo negativo", async () => {
			repo.saveVehicle.mockResolvedValue(undefined);

			await expect(
				service.registerVehicle(undefined, "fuelCar", "FiatPunto", "gasoline", -2)
			).rejects.toThrow("Consumo inválido.");

			expect(repo.saveVehicle).not.toHaveBeenCalled();
		});
	});

	describe("{H13} GetVehicles", () => {
		test("H13-E1 - Válido: obtiene vehículos del usuario activo", async () => {
			const mockList = [
				buildVehicle({ name: "City Bike", type: "Bike" }),
				buildVehicle({ name: "Eco Car", type: "ElectricCar", fuelType: "electric" as FuelType }),
			];

			repo.getVehiclesByOwnerId.mockResolvedValue(mockList);

			const result = await service.getVehicles(undefined);

			expect(repo.getVehiclesByOwnerId).toHaveBeenCalledWith(OWNER_ID);
			expect(result).toEqual(mockList);
		});

		test("H13-E2 - Válido: devuelve una lista vacía cuando no hay vehículos", async () => {
			repo.getVehiclesByOwnerId.mockResolvedValue([]);

			const result = await service.getVehicles(undefined);

			expect(result).toEqual([]);
			expect(repo.getVehiclesByOwnerId).toHaveBeenCalledWith(OWNER_ID);
		});

		test("H13-E3 - Inválido: arroja error si no hay sesión", async () => {
			sessionSpy.mockReturnValueOnce(undefined as any);

			await expect(service.getVehicles(undefined)).rejects.toThrow(
				"UserNotFound: User session not found. Provide an explicit userId or ensure the session is logged in."
			);

			expect(repo.getVehiclesByOwnerId).not.toHaveBeenCalled();
		});
	});

	describe("{H14} DeleteVehicle", () => {
		test("H14-E1 - Válido: elimina un vehículo del usuario", async () => {
			repo.deleteVehicle.mockResolvedValue(undefined);

			await service.deleteVehicle(OWNER_ID, "OldBike");

			expect(repo.deleteVehicle).toHaveBeenCalledWith(OWNER_ID, "OldBike");
		});

		test("H14-E2 - Inválido: lanza error al borrar uno inexistente", async () => {
			repo.deleteVehicle.mockRejectedValue(new Error("VehicleNotFoundException"));

			await expect(service.deleteVehicle(OWNER_ID, "GhostCar")).rejects.toThrow(
				"VehicleNotFoundException"
			);
		});
	});
});
