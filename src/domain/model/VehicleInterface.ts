
//Los tipos de combustible que puede tener un vehículo
export type FuelType = 'gasoline' | 'diesel' | 'electric';


// Interfaz para representar la cantidad y la unidad del consumo
export interface Consumption {
    amount: number;     // valor numérico
    unit: 'L/100km' | 'kWh/100km';// unidad de medida
}


//Nuestra interfaz que usaremos para crear vehiculos segun el tipo
//Usaremos el patron Factory Method
export interface Vehicle {
    name: string;
    fuelType: FuelType | null;//la bici es null
    consumption: Consumption; 
    mostrarInfo(): void; 
}
