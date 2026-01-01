
//Los tipos de combustible que puede tener un vehículo
export type FuelType = 'gasoline' | 'diesel' | 'electric';


// Interfaz para representar la cantidad y la unidad del consumo
export interface Consumption {
  amount: number;     // valor numérico
  unit: 'l/100km' | 'kwh/100km' | 'kcal/min'; // unidad de medida
}


//Nuestra interfaz que usaremos para crear vehiculos segun el tipo
//Usaremos el patron Factory Method
export interface Vehicle {
    name: string;
    fuelType: FuelType | null;//la bici es null
    consumption: Consumption; 
    type: string; //Bike, ElectricCar, FuelCar, Walking para poder saber tipo a la hora de guardarlo y mostrarlo ya que walking y bike dan problemas porque son casi iguales
  favorite?: boolean;
    mostrarInfo(): void; 
}
