
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
    } catch (error) {
        console.error("Error en beforeAll:", error);
    }

});

describe("Tests aceptación segunda iteración {h13}: GetVehicles", () => {
    test("H13-E1 - Válido: el usuario obtiene sus vehículos correctamente",
        async () => {
            const vehicles: Vehicle[] = await vehicleService.getVehicles("al123456@uji.es");
            expect(vehicles).toBeInstanceOf(Array);
            expect(vehicles.length).toBeGreaterThan(0);//debe  ser >0 aunque lo cambiaremos y comprobaremos cuando tengamos el save implementado y mergeado
        },
    );

    test("H13-E2 - Válido: el usuario obtiene 0 vehículos ",
        async () => {
            const vehicles: Vehicle[] = await vehicleService.getVehicles("haytameelharhari@gmail.com");//usuario sin vehículos
            expect(vehicles).toBeInstanceOf(Array);
            expect(vehicles.length).toBe(0);
        },
    );

        test("H13-E3 - Inválido: el usuario obtiene vehículos sin estar logueado",
        async () => {
            // const vehicle = VehicleFactory.createVehicle("Fiat Punto", "fuelCar", "gasoline", 5);
            await expect(
                vehicleService.getVehicles(undefined)
            ).rejects.toThrow("UserNotFound: User session not found. Provide an explicit userId or ensure the session is logged in.");
        },
    );
});
