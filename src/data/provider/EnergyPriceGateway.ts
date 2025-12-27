import { type CostEstimatorGateway, type PriceSnapshot } from "../../domain/decorators/Cost/CostEstimatorDecorator";

export type VehicleEnergySource = "diesel" | "gasoline" | "electric";

interface FuelPriceAverages {
  diesel?: number;
  gasoline?: number;
}

const FUEL_ENDPOINT =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

const ELECTRICITY_ENDPOINT_BASE =
  "https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real";

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

const toIsoMinute = (date: Date) => {
  const iso = date.toISOString();
  return iso.slice(0, 16);
};

const sanitizeNumber = (value: any): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const average = (values: number[]): number | undefined => {
  if (!values.length) return undefined;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
};

export class EnergyPriceGateway implements CostEstimatorGateway {
  private cache?: PriceSnapshot;
  private cacheExpiresAt = 0;

  constructor(private readonly ttlMs: number = DEFAULT_TTL_MS) {}

  /**
   * Devuelve información sobre la caché actual para diagnosticar expiración.
   * - `snapshot`: el `PriceSnapshot` almacenado (si existe)
   * - `expiresAt`: timestamp (ms) en que caduca la caché, o null si no hay caché
   * - `ttlMs`: el TTL configurado en ms
   */
  getCacheInfo() {
    return {
      snapshot: this.cache ?? null,
      expiresAt: this.cache ? this.cacheExpiresAt : null,
      ttlMs: this.ttlMs,
    };
  }

  async getLatestPrices(): Promise<PriceSnapshot> {
    const now = Date.now();
    if (this.cache && now < this.cacheExpiresAt) {
      return this.cache;
    }

    const [fuel, electricity] = await Promise.all([this.fetchFuelPrices(), this.fetchElectricityPrice()]);

    this.cache = {
      currency: "EUR",
      dieselPerLiter: fuel.diesel,
      gasolinePerLiter: fuel.gasoline,
      electricityPerKwh: electricity ?? undefined,
      timestamp: now,
      source: "energy-price-gateway",
    };
    this.cacheExpiresAt = now + this.ttlMs;

    return this.cache;
  }

  async prefetch(): Promise<void> {
    try {
      await this.getLatestPrices();
    } catch (err) {
      console.warn("EnergyPriceGateway: unable to prefetch prices", err);
    }
  }

  private async fetchFuelPrices(): Promise<FuelPriceAverages> {
    const res = await fetch(FUEL_ENDPOINT);
    if (!res.ok) {
      throw new Error(`EnergyPriceGateway: fuel request failed with status ${res.status}`);
    }
    const data = await res.json();
    const entries = Array.isArray(data?.ListaEESSPrecio) ? data.ListaEESSPrecio : [];
    const dieselValues: number[] = [];
    const gasolineValues: number[] = [];

    for (const entry of entries) {
      const dieselPrice = sanitizeNumber(entry?.["Precio Gasoleo A"]);
      if (dieselPrice != null) dieselValues.push(dieselPrice);
      const gasolinePrice = sanitizeNumber(entry?.["Precio Gasolina 95 E5"]);
      if (gasolinePrice != null) gasolineValues.push(gasolinePrice);
    }

    return {
      diesel: average(dieselValues),
      gasoline: average(gasolineValues),
    };
  }

  private async fetchElectricityPrice(): Promise<number | undefined> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 60 * 1000);
    const params = new URLSearchParams({
      start_date: `${toIsoMinute(start)}`,
      end_date: `${toIsoMinute(end)}`,
      time_trunc: "hour",
    });

    const res = await fetch(`${ELECTRICITY_ENDPOINT_BASE}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`EnergyPriceGateway: electricity request failed with status ${res.status}`);
    }

    const payload = await res.json();
    const values =
      payload?.included?.[0]?.attributes?.values ?? payload?.data?.attributes?.values ?? payload?.data?.values ?? [];

    const readings: number[] = [];
    for (const entry of values) {
      const reading = sanitizeNumber(entry?.value);
      if (reading != null) readings.push(reading);
    }

    const avgMwh = average(readings);
    if (avgMwh == null) return undefined;
    const pricePerKwh = avgMwh / 1000; // €/MWh -> €/kWh
    return Number.isFinite(pricePerKwh) ? pricePerKwh : undefined;
  }
}

export const energyPriceGateway = new EnergyPriceGateway();
