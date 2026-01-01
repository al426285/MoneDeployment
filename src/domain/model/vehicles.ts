import type { Vehicle, Consumption, FuelType } from './VehicleInterface';



//BICICLETA
export class Bike implements Vehicle {
    name: string;
    type: string = 'Bike';
    fuelType: FuelType | null = null;
    consumption: Consumption;
    favorite?: boolean;

    constructor(name: string, consumptionAmount: number) {
        this.name = name;
        this.consumption = { amount: consumptionAmount, unit: 'kcal/min' };
    }

    mostrarInfo(): void {
        console.log(`Vehículo: Bici, Nombre: ${this.name}`);
    }
}

//caminar
export class Walking implements Vehicle {
    name: string;
    type: string = 'Walking';
    fuelType: FuelType | null = null;
    consumption: Consumption;
    favorite?: boolean;

    constructor(name: string, caloriesPerMin: number = 5) { // por defecto son unas 5 kcal/min
        this.name = name;
        this.consumption = { amount: caloriesPerMin, unit: 'kcal/min' };
    }

    mostrarInfo(): void {
        console.log(`Vehículo: Walking, Nombre: ${this.name}, Consumo: ${this.consumption.amount} ${this.consumption.unit}`);
    }
}


// Coche Eléctrico
export class ElectricCar implements Vehicle {
    name: string;
    type: string = 'ElectricCar';
    fuelType: FuelType = 'electric';
    consumption: Consumption;
    favorite?: boolean;

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
    type: string = 'FuelCar';
    fuelType: FuelType = 'gasoline';
    consumption: Consumption;
    favorite?: boolean;

    constructor(name: string, fuelType: FuelType, consumptionAmount: number) {
        if (fuelType !== 'gasoline' && fuelType !== 'diesel') {
            throw new Error('FuelCar can only be gasoline or diesel');
        }

        this.name = name;
        this.fuelType = fuelType;
        this.consumption = { amount: consumptionAmount, unit: 'L/100km' };
        this.fuelType = fuelType;
    }

    mostrarInfo(): void {
        console.log(`Vehículo: Coche de combustión, Nombre: ${this.name}, Consumo: ${this.consumption.amount} ${this.consumption.unit}`);
    }
}




