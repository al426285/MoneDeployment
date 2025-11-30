import type { Vehicle, Consumption, FuelType } from './VehicleInterface';



//BICICLETA
export class Bike implements Vehicle {
    name: string;
    fuelType: FuelType | null = null;
    consumption: Consumption = { amount: 0, unit: 'L/100km' };

    constructor(name: string) {
        this.name = name;
    }

    mostrarInfo(): void {
        console.log(`Vehículo: Bici, Nombre: ${this.name}`);
    }
}


// Coche Eléctrico
export class ElectricCar implements Vehicle {
    name: string;
    fuelType: FuelType = 'electric';
    consumption: Consumption;

    constructor(name: string, consumptionAmount: number) {
        this.name = name;
        this.consumption = { amount: consumptionAmount, unit: 'kWh/100km' };
    }

    mostrarInfo(): void {
        console.log(`Vehículo: Coche eléctrico, Nombre: ${this.name}, Consumo: ${this.consumption.amount} ${this.consumption.unit}`);
    }
}


// Coche de Combustión
export class FuelCar implements Vehicle {
    name: string;
    fuelType: FuelType = 'gasoline';
    consumption: Consumption;

    constructor(name: string, fuelType: FuelType, consumptionAmount: number) {
        if (fuelType !== 'gasoline' && fuelType !== 'diesel') {
            throw new Error('FuelCar can only be gasoline or diesel');
        }

        this.name = name;
        this.consumption = { amount: consumptionAmount, unit: 'L/100km' };
    }

    mostrarInfo(): void {
        console.log(`Vehículo: Coche de combustión, Nombre: ${this.name}, Consumo: ${this.consumption.amount} ${this.consumption.unit}`);
    }
}




