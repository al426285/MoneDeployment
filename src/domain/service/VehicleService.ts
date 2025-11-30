
import type { VehicleRepositoryInterface as VehicleRepository } from "../repository/VehicleRepositoryInterface";
import { UserSession } from "../session/UserSession";
import type { Vehicle } from "../model/VehicleInterface";


export class VehicleService {
    private vehicleRepository: VehicleRepository;
    private static instance: VehicleService;

    constructor(vehicleRepository: VehicleRepository) {
        this.vehicleRepository = vehicleRepository;
    }
    // método para obtener la instancia singleton
    public static getInstance(vehicleRepository?: VehicleRepository): VehicleService {
        if (!VehicleService.instance) {
            if (!vehicleRepository) {
                throw new Error("VehicleRepository must be provided for the first initialization");
            }
            VehicleService.instance = new VehicleService(vehicleRepository);
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
}