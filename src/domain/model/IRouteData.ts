/**
 * Unidades de distancia manejadas por el sistema.
 * - "m"  : metros
 * - "km" : kilómetros
 * - "mi" : millas
 */
export type DistanceUnit = "m" | "km" | "mi";

/**
 * Unidades de consumo para vehículos de combustión:
 * - l_per_100km : litros por 100 km (canonical)
 * - km_per_l    : kilómetros por litro (alternativa)
 */
export type CombustionConsumptionUnit = "l/100km" | "km/l";

export type CaloriesUnit = "kcal/min";

/**
 * Unidades de consumo para vehículos eléctricos:
 * - kwh_per_100km : kWh por 100 km (canonical)
 * - km_per_kwh    : kilómetros por kWh (alternativa)
 */
export type ElectricConsumptionUnit = "kwh/100km" | "km/kwh";

/** Unión de todas las unidades de consumo admitidas */
export type ConsumptionUnit = CombustionConsumptionUnit | ElectricConsumptionUnit | CaloriesUnit;

/** Familia de energía asociada a una unidad de consumo */
export type ConsumptionFuelType = "combustion" | "electric";

/** Predicado: true si la unidad pertenece a la familia combustión */
export const isCombustionConsumptionUnit = (value: any): value is CombustionConsumptionUnit =>
  value === "l/100km" || value === "km/l";

/** Predicado: true si la unidad pertenece a la familia eléctrica */
export const isElectricConsumptionUnit = (value: any): value is ElectricConsumptionUnit =>
  value === "kwh/100km" || value === "km/kwh";


export const isCaloriesConsumptionUnit = (value: any): value is CaloriesUnit =>
  value === "kcal/min";
/**
 * Infiera la familia de energía (combustión/electric) a partir de una unidad.
 * Uso: para decidir qué precio usar o qué convertidor aplicar.
 */
export const inferConsumptionFuelType = (unit: ConsumptionUnit): ConsumptionFuelType =>
  isCombustionConsumptionUnit(unit) ? "combustion" : "electric";

/**
 * Comprueba compatibilidad entre dos unidades de consumo.
 * Devuelve true si ambas pertenecen a la misma familia (combustión vs eléctrico).
 * Esto evita conversiones inválidas entre diesel/gasolina <-> electricidad.
 */
export const areConsumptionUnitsCompatible = (a: ConsumptionUnit, b: ConsumptionUnit): boolean =>
  inferConsumptionFuelType(a) === inferConsumptionFuelType(b);

/**
 * Contrato principal que representa una ruta calculada.
 * Implementaciones deben devolver valores canónicos y documentados:
 * - Distancia: ver getDistanceUnit()
 * - Duración: en minutos
 * - Consumo: valor por cada 100 km (si procede) y unidad asociada
 * - Coste: valor numérico y moneda 
 *
 * Notas:
 * - Los getters deben ser puros (sin efectos secundarios).
 * - Si un dato no está disponible, devolver null (para consumo) o 0 para numéricos cuando tenga sentido.
 */
export interface IRouteData {
  /** Distancia de la ruta en la unidad indicada por getDistanceUnit() */
  getDistance(): number;

  /** Unidad en la que getDistance() está expresada (m | km | mi) */
  getDistanceUnit(): DistanceUnit;

  /** Duración total de la ruta en minutos */
  getDuration(): number; // minutes

  /** Tipo de movilidad (por ejemplo "car", "electric_car", "bike") */
  getMobilityType(): string;

  /** Tipo de ruta (por ejemplo "fastest", "shortest", "eco") */
  getRouteType(): string;

  /** Pasos/instrucciones de la ruta (puede estar vacía) */
  getSteps(): string[];

  /**
   * Valor de consumo expresado en la unidad indicada por getConsumptionUnit().
   * - Puede representar L/100km, km/L, kWh/100km, km/kWh o kcal/min según movilidad.
   * - Si no hay estimación, devolver null.
   */
  getConsumptionValue(): number | null;

  /**
   * Unidad asociada al consumo devuelto por getConsumptionValue().
   * - Usa ConsumptionUnit (l/100km | km/l | kwh/100km | km/kwh | kcal/min)
   * - Puede ser null si no aplica o no está disponible.
   */
  getConsumptionUnit(): ConsumptionUnit | null;

  /** Coste estimado asociado a la ruta (en la moneda indicada por getCostCurrency()) */
  getCost(): number;

  /** Código ISO de la moneda usada en getCost(), por ejemplo "EUR" */
  getCostCurrency(): string; //EUR

  /** Secuencia de coordenadas [lat, lng] que representan la geometría de la ruta */
  getPolyline(): Array<[number, number]> | null;
}
