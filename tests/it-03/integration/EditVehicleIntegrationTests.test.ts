import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { VehicleService } from "../../../src/domain/service/VehicleService";
import { UserSession } from "../../../src/domain/session/UserSession";
import type { Vehicle } from "../../../src/domain/model/VehicleInterface";

describe("HU15 - Editar los datos de un vehículo", () => {
	const OWNER_ID = "al123456@uji.es";

	let service: VehicleService;
	let vehicleRepositoryMock: any;

	beforeEach(() => {
    //Creamos un repositorio falso con solo los métodos que usa editVehicle.
		vehicleRepositoryMock = {
			getVehicleByName: vi.fn(),
			updateVehicle: vi.fn(),
			getVehiclesByOwnerId: vi.fn(),
		};

		service = new VehicleService(vehicleRepositoryMock);//le inyectamos el repo falso, el mock

    //fingimos que hay un usuario logueado
		vi.spyOn(UserSession, "loadFromCache").mockReturnValue({
			userId: OWNER_ID,
			token: "TOKEN",
		} as any);
	});

	afterEach(() => {//Limpia todos los mocks después de cada test
		vi.restoreAllMocks(); 
	});

	test("E1 válido: cambiar el combustible de Fiat Punto a diésel", async () => {
		
    const currentVehicle: Vehicle = {
			name: "Fiat Punto",
			type: "FuelCar",
			fuelType: "gasoline",
			consumption: { amount: { amount: 4.5, unit: "L/100km" }, unit: "L/100km" },
			mostrarInfo: vi.fn(),
		};

    //solo modificamos el fuelType
		const updatedVehicle: Vehicle = {
			...currentVehicle,
			fuelType: "diesel",
		};

		vehicleRepositoryMock.getVehicleByName
			.mockResolvedValueOnce(currentVehicle) // antes del edit
			.mockResolvedValueOnce(updatedVehicle); // después del edit

		vehicleRepositoryMock.updateVehicle.mockResolvedValue(undefined);//Simulamos que el update en BD funciona.

		const result = await service.editVehicle(
			undefined,
			"Fiat Punto",
			{ fuelType: "diesel" }
		);

		expect(vehicleRepositoryMock.updateVehicle).toHaveBeenCalledTimes(1);

		const [ownerId, vehicleName, entity] =
			vehicleRepositoryMock.updateVehicle.mock.calls[0];// el edit lo ha llamado con estos parámetros, del historial de llamadas del mock devuelve la primera llamada

	//comprobaciones de que ha sido llamado correctamente con los parámetros esperados
    expect(ownerId).toBe(OWNER_ID);
		expect(vehicleName).toBe("Fiat Punto");
		expect(entity.fuelType).toBe("diesel");

    //comprobaciones del resultado devuelto por editVehicle
		expect(result.fuelType).toBe("diesel");
	});

	test("E2 inválido: editar un vehículo inexistente lanza excepción", async () => {
		vehicleRepositoryMock.getVehicleByName.mockResolvedValue(null);

		await expect(
			service.editVehicle(undefined, "Seat Ibiza", { fuelType: "diesel" })
		).rejects.toThrow("VehicleNotFoundException");

		expect(vehicleRepositoryMock.updateVehicle).not.toHaveBeenCalled();
	});
});
