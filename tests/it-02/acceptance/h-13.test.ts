
import { describe, test, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from "vitest";
import { UserService } from "../../../src/domain/service/UserService";

import type { Vehicle } from "../../../src/domain/model/VehicleInterface";
import { VehicleService } from "../../../src/domain/service/VehicleService";

import { VehicleRepositoryFirebase } from "../../../src/data/repository/VehicleRepositoryFirebase";
const vehicleService = VehicleService.getInstance(new VehicleRepositoryFirebase());
const userService = UserService.getInstance();

beforeAll(async () => {
    // Crear usuario de prueba e iniciar sesión
    try {
        // await userService.signUp("al123456@uji.es", "Maria", "MiContrasena64");
        await userService.logIn("al123456@uji.es", "MiContrasena64");
        await vehicleService.registerVehicle("al123456@uji.es", "fuelCar", "Fiat Punto", "gasoline", 4.5);
    } catch (error) {
        // console.error("Error en beforeAll:", error);
    }

});

afterEach(async () => {
    try {
        await vehicleService.deleteVehicle("al123456@uji.es", "Fiat Punto");
    } catch {
        //ignoramos errores
    }
});


describe("Tests aceptación segunda iteración {h13}: GetVehicles", () => {
    test("H13-E1 - Válido: el usuario obtiene sus vehículos correctamente",
        async () => {
            const vehicles: Vehicle[] = await vehicleService.getVehicles("al123456@uji.es");
            expect(vehicles).toBeInstanceOf(Array);
            expect(vehicles).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: "Fiat Punto",
                        type: "FuelCar",
                        fuelType: "gasoline",
                        consumption: expect.objectContaining({ amount: 4.5 }),
                    }),
                ])
            );
        },
    );


    test("H13-E3 - Inválido: el usuario obtiene vehículos sin estar logueado",
        async () => {
            // const vehicle = VehicleFactory.createVehicle("Fiat Punto", "fuelCar", "gasoline", 5);
            await expect(
                vehicleService.getVehicles(undefined)
            ).rejects.toThrow("UserNotFound");
        },
    );
});
