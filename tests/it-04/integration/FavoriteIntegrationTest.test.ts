import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import type { SpyInstance } from "vitest";
import { VehicleService } from "../../../src/domain/service/VehicleService";
import { UserSession } from "../../../src/domain/session/UserSession";
import type { Vehicle } from "../../../src/domain/model/VehicleInterface";

type VehicleRepositoryMock = {
    getVehiclesByOwnerId: ReturnType<typeof vi.fn>;
    saveVehicle: ReturnType<typeof vi.fn>;
    deleteVehicle: ReturnType<typeof vi.fn>;
    updateVehicle: ReturnType<typeof vi.fn>;
    getVehicleByName: ReturnType<typeof vi.fn>;
};

const buildVehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
    name: "Fiat Punto",
    type: "fuelCar",
    fuelType: "gasoline",
    favorite: false,
    consumption: { amount: 4.5, unit: "l/100km" },
    mostrarInfo: vi.fn(),
    ...overrides,
});

describe("HU23 - Favorite vehicles integration", () => {
    const USER_ID = "al123456@uji.es";
    let repo: VehicleRepositoryMock;
    let service: VehicleService;
    let sessionSpy: SpyInstance;
    let store: Record<string, Vehicle[]>;

    const seedVehicles = (vehicles: Vehicle[]) => {
        store[USER_ID] = vehicles.map((vehicle) => ({
            ...vehicle,
            consumption: { ...vehicle.consumption },
        }));
    };

    const setNavigatorStatus = (online: boolean) => {
        Object.defineProperty(globalThis, "navigator", {
            value: { onLine: online } as Navigator,
            configurable: true,
        });
    };

    beforeEach(() => {
        store = {};
        setNavigatorStatus(true);
        globalThis.localStorage = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
            key: vi.fn(() => null),
            length: 0,
        } as unknown as Storage;

        repo = {
            getVehiclesByOwnerId: vi.fn(async (ownerId: string) => store[ownerId] ?? []),
            saveVehicle: vi.fn(),
            deleteVehicle: vi.fn(),
            updateVehicle: vi.fn(async (ownerId: string, vehicleName: string, updates: Partial<Vehicle>) => {
                const list = store[ownerId] ?? [];
                const index = list.findIndex((vehicle) => vehicle.name === vehicleName);
                if (index === -1) throw new Error("VehicleNotFoundException");

                if (updates.favorite && list[index].favorite) {
                    throw new Error("VehicleAlreadySavedAsFavouriteException");
                }

                list[index] = {
                    ...list[index],
                    ...updates,
                    consumption: updates.consumption
                        ? { ...list[index].consumption, ...updates.consumption }
                        : list[index].consumption,
                };
            }),
            getVehicleByName: vi.fn(async (ownerId: string, vehicleName: string) => {
                const found = (store[ownerId] ?? []).find((vehicle) => vehicle.name === vehicleName);
                return found ? { ...found, consumption: { ...found.consumption } } : null;
            }),
        } as VehicleRepositoryMock;

        service = new VehicleService(repo as any);

        sessionSpy = vi.spyOn(UserSession, "loadFromCache").mockReturnValue({
            userId: USER_ID,
            token: "token",
        } as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("setFavorite - marcar favoritos", () => {
        test("E1 - Válido: marca un vehículo como favorito", async () => {
            seedVehicles([buildVehicle({ favorite: false })]);

            await service.setFavorite(undefined, "Fiat Punto", true);

            expect(repo.updateVehicle).toHaveBeenCalledWith(USER_ID, "Fiat Punto", { favorite: true });
            expect(store[USER_ID][0].favorite).toBe(true);
        });

        test("E2 - Válido: desmarca un vehículo como favorito", async () => {
            seedVehicles([buildVehicle({ favorite: true })]);

            await service.setFavorite(undefined, "Fiat Punto", false);

            expect(repo.updateVehicle).toHaveBeenCalledWith(USER_ID, "Fiat Punto", { favorite: false });
            expect(store[USER_ID][0].favorite).toBe(false);
        });

        test("E3 - Inválido: el vehículo no existe", async () => {
            seedVehicles([]);

            await expect(service.setFavorite(undefined, "Missing", true)).rejects.toThrow(
                "VehicleNotFoundException"
            );
        });
    });

    describe("setFavorite -desmarcar favoritos", () => {
        test("HU27 E1 - Válido: desmarca un vehículo como favorito", async () => {
            seedVehicles([buildVehicle({ favorite: true })]);

            await service.setFavorite(undefined, "Fiat Punto", false);

            expect(repo.updateVehicle).toHaveBeenCalledWith(USER_ID, "Fiat Punto", { favorite: false });
            expect(store[USER_ID][0].favorite).toBe(false);
        });

        test("HU27 E6 - Inválido: base de datos no disponible", async () => {
            seedVehicles([buildVehicle({ favorite: true })]);
            setNavigatorStatus(false);

            await expect(service.setFavorite(undefined, "Fiat Punto", false)).rejects.toThrow(
                "DatabaseNotAvailableException"
            );

            setNavigatorStatus(true);
            expect(repo.updateVehicle).not.toHaveBeenCalled();
            expect(store[USER_ID][0].favorite).toBe(true);
        });

     
    });
});
