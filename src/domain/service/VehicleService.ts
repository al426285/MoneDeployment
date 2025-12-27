
import type { VehicleRepositoryInterface as VehicleRepository } from "../repository/VehicleRepositoryInterface";
import { VehicleFactory } from "../model/VehicleFactory";
import type { FuelType } from "../model/VehicleInterface";
import { isValidVehicleName } from "../../core/utils/validators";
import { UserSession } from "../session/UserSession";
import type { Vehicle } from "../model/VehicleInterface";
import { VehicleRepositoryFirebase } from "../../data/repository/VehicleRepositoryFirebase";


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
        return this.vehicleRepository.getVehiclesByOwnerId(ownerId);
    }

    //tipo {(walking, bike, electricCar, fuelCar), fueltype{ gasoline, diesel} el electric se le asigna por defecto, consumo{numero}}
    async registerVehicle(ownerId: string | undefined, type: string, name: string, fuelType?: FuelType, consumption?: number): Promise<void> {


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
        if (type === "electricCar" && fuelType !== "electric") {
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

    

       // console.log("Created vehicle:", vehicle.type);   

        // Guardamos en Firebase
        await this.vehicleRepository.saveVehicle(ownerId, vehicle);
    }
    async deleteVehicle(ownerId: string, vehicleName: string): Promise<void> {
        return this.vehicleRepository.deleteVehicle(ownerId, vehicleName);
    }

    async editVehicle(ownerId: string, vehicleName: string, updates: Partial<Vehicle>): Promise<Vehicle> {
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
            return refreshed;

    }
    async getVehicleDetails(vehicleName: string, userId: string): Promise<Vehicle | null> {
        return this.vehicleRepository.getVehicleByName(userId, vehicleName);
    }
}