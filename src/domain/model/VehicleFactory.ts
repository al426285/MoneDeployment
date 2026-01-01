import type { Vehicle, FuelType } from './VehicleInterface';
import { Bike, ElectricCar, FuelCar, Walking } from './vehicles';
import { isValidVehicleName } from '../../core/utils/validators';

// Clase Fábrica para crear vehículos según el tipo (type)
export class VehicleFactory {

    /**
     * @param type Tipo de vehículo: "bike", "electricCar" o "fuelCar"
     * @param fuelType Tipo de combustible ("gasoline", "diesel" o "electric") 
     * @param type {Bike, ElectricCar, FuelCar, Walking}
     * @param consumption Valor de consumo según el tipo (kWh/100km o L/100km)
     */
    static createVehicle(type: string, name: string, fuelType?: FuelType, consumption: number = 0, favorite = false
    ): Vehicle {

        // Validación del nombre
        if (!isValidVehicleName(name)) {
            throw new Error('Nombre de vehículo inválido');
        }

        switch (type.toLowerCase()) {
            case 'bike':
                return Object.assign(new Bike(name, consumption), { favorite });

            case 'walking':
                return Object.assign(new Walking(name, consumption), { favorite });

            case 'electriccar':
                if (consumption < 0) throw new Error('Consumo inválido para vehículo eléctrico');
                return Object.assign(new ElectricCar(name, consumption), { favorite });

            case 'fuelcar':
                if (!fuelType || (fuelType !== 'gasoline' && fuelType !== 'diesel')) {
                    throw new Error('FuelCar solo puede ser gasoline o diesel');
                }
                if (consumption < 0) throw new Error('Consumo inválido para coche de combustible');
                return Object.assign(new FuelCar(name, fuelType, consumption), { favorite });

            default:
                throw new Error(`Tipo de vehículo desconocido: ${type}`);
        }
    }
}

