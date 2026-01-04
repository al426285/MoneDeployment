// Comentado: explicación de cada parte del fichero y notas para implementar getCost()

import { type IRouteData } from "../../model/IRouteData";
import { RouteDecorator } from "../route/RouteDecorator";
import { canonicalizeConsumption, distanceToKm } from "../../utils/consumption";

/**
 * PriceSnapshot
 * - currency: código ISO de la moneda (p. ej. "EUR").
 * - dieselPerLiter / gasolinePerLiter: precio medio en €/L (no negativos).
 * - electricityPerKwh: precio medio en €/kWh (no negativos). Si la fuente devuelve €/MWh
 *   debe haberse convertido a €/kWh (÷ 1000) antes de crear el snapshot.
 * - timestamp: milisegundos epoch indicando cuándo se obtuvo/compiló el snapshot.
 * - source: (opcional) URL o identificador de la(s) fuente(s) para depuración.
 */
export interface PriceSnapshot {
  currency: string; // EUR
  dieselPerLiter?: number;
  gasolinePerLiter?: number;
  electricityPerKwh?: number;
  timestamp: number; // momento en que se obtuvieron los precios (ms epoch)
  source?: string; // fuente de los datos
}

/**
 * CostEstimatorGateway
 * - Interface para módulos que recuperan/actualizan PriceSnapshot.
 * - Implementaciones pueden cachear, normalizar y manejar reintentos.
 */
export interface CostEstimatorGateway {
  getLatestPrices(): Promise<PriceSnapshot>;
}

/*
  NOTAS GENERALES:
  - Este fichero define el decorador que añade estimación de coste a un IRouteData.
  - getCost() debe ser determinista y no realizar llamadas async; priceSnapshot
    debe estar previamente obtenido y pasado al constructor.
  - Unidades esperadas (según contrato IRouteData):
      * Distancia: getDistance() con getDistanceUnit() → "m" | "km" | "mi".
      * Duración: minutos (getDuration()).
      * Consumo: getConsumptionValue() y getConsumptionUnit() → puede venir
        como L/100km, km/L, kWh/100km, km/kWh. Normalizar a "por 100 km" antes de usar.
  - Fórmulas recomendadas:
      * Combustión: cost = (distance_km / 100) * (L_per_100km) * price_€/L
      * Eléctrico : cost = (distance_km / 100) * (kWh_per_100km) * price_€/kWh
  - Fallbacks:
      * Si no hay priceSnapshot, o faltan datos (consumo o precio), devolver
        el coste provisto por la ruta (this.route.getCost()) para no perder info.
      * Validar valores: distance > 0, consumption > 0, price >= 0.
  - Precisión / presentación:
      * Calcular con números en punto flotante y redondear a 2 decimales al devolver.
  - No realizar conversiones inválidas entre familias (combustión <-> eléctrico).
  - Registrar (console.warn) en caso de fallback para facilitar debugging (opcional).
*/

/*
  Recordatorio: IRouteData expone:
    - getDistance(): number
    - getDistanceUnit(): "m" | "km" | "mi"
    - getConsumptionValue(): number | null
    - getConsumptionUnit(): ConsumptionUnit | null
    - getCost(): number
    - getCostCurrency(): string
  getCost() aquí debe usar esos getters y priceSnapshot para calcular y devolver
  el coste estimado en la moneda indicada por priceSnapshot.currency (si existe).
*/

export class CostEstimatorDecorator extends RouteDecorator {
  /**
   * @param route  IRouteData original (proveedor)
   * @param priceSnapshot  snapshot con precios normalizados (ya convertido a €/kWh o €/L)
   */
  constructor(route: IRouteData, private readonly priceSnapshot?: PriceSnapshot | null) {
    super(route);
  }

  /**
   * getCost
   * - Actualmente devuelve el coste original provisto por la ruta.
   * - Implementación esperada:
   *    1) Obtener distancia en km a partir de getDistance() y getDistanceUnit().
   *    2) Obtener consumo normalizado a "por 100 km" (L/100km o kWh/100km).
   *       * Si la unidad es km/L o km/kWh convertir: per100 = 100 / (km_per_unit).
   *    3) Seleccionar precio por unidad según tipo (electric / gasoline / diesel).
   *       * Si no hay indicador del tipo, preferir gasolina, luego diésel, o promedio.
   *    4) Calcular: cost = (distance_km / 100) * consumption_per_100km * price_per_unit.
   *    5) Validar y redondear; si falta información devolver this.route.getCost().
   *
   * Importante: NO hacer llamadas async dentro de este método. El priceSnapshot debe
   * estar ya disponible cuando se construye este decorador.
   */
  getCost(): number {
    // If a cost is already present (computed by facade/persistence), keep it.
    const existing = this.route.getCost();
    if (existing != null && Number.isFinite(existing) && existing > 0) return existing;

    const snap = this.priceSnapshot;
    if (!snap) return this.route.getCost();

    // distance -> km
    const distanceKm = distanceToKm(this.route.getDistance(), this.route.getDistanceUnit());
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) return this.route.getCost();

    // canonicalize consumption to per 100km (L/100km or kwh/100km)
    const rawConsumption = this.route.getConsumptionValue();
    const rawUnit = this.route.getConsumptionUnit?.() ?? null;
    const canon = canonicalizeConsumption(rawConsumption ?? null, rawUnit ?? null);
    if (!canon || !Number.isFinite(canon.value) || canon.value <= 0) return this.route.getCost();

    const isElectric = String(canon.unit).toLowerCase().includes("kwh");
    let pricePerUnit: number | undefined;
    if (isElectric) {
      pricePerUnit = snap.electricityPerKwh;
    } else {
      pricePerUnit = snap.gasolinePerLiter ?? snap.dieselPerLiter;
    }

    if (pricePerUnit == null || !Number.isFinite(pricePerUnit) || pricePerUnit < 0) return this.route.getCost();

    const cost = (distanceKm / 100) * canon.value * pricePerUnit;
    const rounded = Math.round((Number.isFinite(cost) ? cost : 0) * 100) / 100;
    return Math.max(rounded, 0);
  }

  /**
   * getCostCurrency
   * - Si hay snapshot con moneda, usarla; si no, delegar en la ruta original.
   */
  getCostCurrency(): string {
    return this.priceSnapshot?.currency ?? this.route.getCostCurrency();
  }

  /**
   * getPriceSnapshot
   * - Expone el snapshot usado por el decorador (útil para pruebas o UI).
   */
  getPriceSnapshot(): PriceSnapshot | null | undefined {
    return this.priceSnapshot;
  }
}
