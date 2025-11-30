import type { Vehicle } from '../model/VehicleInterface';


export interface VehicleRepositoryInterface {
    getVehiclesByOwnerId(ownerId: string): Promise<Vehicle[]>;
}
