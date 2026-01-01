
import type { VehicleRepositoryInterface as VehicleRepository } from "../repository/VehicleRepositoryInterface";
import { VehicleFactory } from "../model/VehicleFactory";
import type { FuelType } from "../model/VehicleInterface";
import { isValidVehicleName } from "../../core/utils/validators";
import { UserSession } from "../session/UserSession";
import type { Vehicle } from "../model/VehicleInterface";
import { VehicleRepositoryFirebase } from "../../data/repository/VehicleRepositoryFirebase";

const VEHICLE_CACHE_KEY = (userId: string) => `vehicles_cache_${userId}`;

const readCache = <T>(key: string): T | null => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
};

const writeCache = (key: string, payload: unknown) => {
    try {
        const wrapped = { data: payload, cachedAt: Date.now() };
        localStorage.setItem(key, JSON.stringify(wrapped));
    } catch { /* ignore cache write errors */ }
};

const requireOnline = () => {
    if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) {
        throw new Error("DatabaseNotAvailableException");
    }
};


export class VehicleService {
    private vehicleRepository: VehicleRepository;
    private static instance: VehicleService;

    constructor(vehicleRepository: VehicleRepository) {
        this.vehicleRepository = vehicleRepository;
    }
    // método para obtener la instancia singleton
    public static getInstance(vehicleRepository?: VehicleRepository): VehicleService {
        if (!VehicleService.instance) {
            const repo = vehicleRepository ?? new VehicleRepositoryFirebase();
            VehicleService.instance = new VehicleService(repo);
        } else if (vehicleRepository) {
            VehicleService.instance.vehicleRepository = vehicleRepository;
        }
        return VehicleService.instance;
    }

    //para saber el userId
    private resolveUserId(explicit?: string): string {
        if (explicit) return explicit;
        const session = UserSession.loadFromCache();
        if (session?.userId) return session.userId;
        throw new Error("UserNotFound: User session not found. Provide an explicit userId or ensure the session is logged in.");
    }


    //OBTENER LISTA DE VEHICULOS
    async getVehicles(ownerId: string | undefined): Promise<Vehicle[]> {
        ownerId = this.resolveUserId(ownerId);
        const cacheKey = VEHICLE_CACHE_KEY(ownerId);
        const rawCache = readCache<{ data: Vehicle[] }>(cacheKey);
      //  console.log("[VehicleService.getVehicles] rawCache:", rawCache);
        const cached = rawCache?.data ?? null;
      //  console.log("[VehicleService.getVehicles] cached (extracted .data):", cached);
        const offline = typeof navigator !== "undefined" && navigator && navigator.onLine === false;
      //  console.log("[VehicleService.getVehicles] offline:", offline);
        if (offline) {
            if (cached) return cached;
            throw new Error("OfflineNoCache");
        }
        try {
            const list = await this.vehicleRepository.getVehiclesByOwnerId(ownerId);
           
            const normalized = (Array.isArray(list) ? list : []).map((v: any) => ({
                ...v,
                favorite: Boolean(v?.favorite || v?.isFavorite),
                isFavorite: Boolean(v?.favorite || v?.isFavorite),
            }));
          
            if (Array.isArray(normalized) && normalized.length === 0 && cached && cached.length > 0) {
                // Avoid wiping cache if an offline/flaky fetch returned empty.
            //    console.log("[VehicleService.getVehicles] returning cached (empty fetch fallback)");
                return cached;
            }
            writeCache(cacheKey, normalized);
            return normalized;
        } catch (err) {
        //    console.error("[VehicleService.getVehicles] error:", err);
            if (cached) return cached; // offline fallback
            throw err;
        }
    }

    //tipo {(walking, bike, electricCar, fuelCar), fueltype{ gasoline, diesel} el electric se le asigna por defecto, consumo{numero}}
    async registerVehicle(ownerId: string | undefined, type: string, name: string, fuelType?: FuelType, consumption?: number): Promise<void> {
        requireOnline();


        ownerId = this.resolveUserId(ownerId);
        // validaciones

        if (!isValidVehicleName(name)) throw new Error("Nombre de vehículo inválido.");
        if (fuelType && !["gasoline", "diesel", "electric"].includes(fuelType)) {
            throw new Error("Tipo de combustible inválido.");
        }

        if ((type === "electricCar" || type === "fuelCar") && (consumption === undefined || consumption < 0)) {
            throw new Error("Consumo inválido.");
        }

        // ElectricCar: fuelType debe ser "electric"
        if (type === "electricCar" && fuelType && fuelType !== "electric") {
            throw new Error("Un vehículo eléctrico debe tener fuelType = 'electric'.");
            //EN VERDAD DA IGUAL PORQUE EN LA FACTORY SE ASIGNA DIRECTAMENTE
        }

        // Bike: fuelType y consumption no deben importan
        if (type === "bike" || type === "walking") {
            fuelType = undefined;
        }


        // Creamos el vehículo usando el patrón Factory Method
        const vehicle = VehicleFactory.createVehicle(
            type,
            name,
            fuelType,
            consumption
        );



        // Guardamos en Firebase
        await this.vehicleRepository.saveVehicle(ownerId, vehicle);
        await this.refreshVehiclesCache(ownerId);
    }
    async deleteVehicle(ownerId: string, vehicleName: string): Promise<void> {
        requireOnline();
        const resolvedId = this.resolveUserId(ownerId);
        await this.vehicleRepository.deleteVehicle(resolvedId, vehicleName);
        await this.refreshVehiclesCache(resolvedId);
    }

    async editVehicle(ownerId: string, vehicleName: string, updates: Partial<Vehicle>): Promise<Vehicle> {
        requireOnline();
        //sin implementar
        const userId = this.resolveUserId(ownerId);
        const current = await this.getVehicleDetails(vehicleName, userId);
        if (!current) throw new Error("VehicleNotFoundException");
        
        const consumptionAmount = updates.consumption
            ? updates.consumption.amount
            : current.consumption.amount;

        const entity = VehicleFactory.createVehicle(
            current.type,
            updates.name ?? current.name,
            (updates.fuelType ?? current.fuelType) || undefined,
            consumptionAmount
        );

        await this.vehicleRepository.updateVehicle(userId, vehicleName, entity);

        const refreshed = await this.vehicleRepository.getVehicleByName(userId, entity.name);
        if (!refreshed) throw new Error("Vehicle could not be refreshed after edit");
        await this.refreshVehiclesCache(userId);
        return refreshed;

    }

    async setFavorite(ownerId: string | undefined, vehicleName: string, favorite: boolean): Promise<void> {
        requireOnline();
        const resolvedId = this.resolveUserId(ownerId);
        await this.vehicleRepository.updateVehicle(resolvedId, vehicleName, { favorite } as any);
        await this.refreshVehiclesCache(resolvedId);
    }
    async getVehicleDetails(vehicleName: string, userId: string): Promise<Vehicle | null> {
        return this.vehicleRepository.getVehicleByName(userId, vehicleName);
    }

    private async refreshVehiclesCache(ownerId: string): Promise<void> {
        const offline = typeof navigator !== "undefined" && navigator && navigator.onLine === false;
        if (offline) return; // avoid overwriting cache with empty offline reads
        try {
            const list = await this.vehicleRepository.getVehiclesByOwnerId(ownerId);
            const normalized = (Array.isArray(list) ? list : []).map((v: any) => ({
                ...v,
                favorite: Boolean(v?.favorite || v?.isFavorite),
                isFavorite: Boolean(v?.favorite || v?.isFavorite),
            }));
            writeCache(VEHICLE_CACHE_KEY(ownerId), normalized);
        } catch {
            /* best-effort cache refresh */
        }
    }
}