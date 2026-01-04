import { type ConsumptionUnit, type DistanceUnit, type IRouteData } from "./IRouteData";

const normalizePolyline = (points?: Array<[number, number]> | null): Array<[number, number]> | null => {
  if (!Array.isArray(points) || points.length === 0) return null;
  const normalized = points
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) return null;
      const lat = Number(point[0]);
      const lng = Number(point[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return [lat, lng] as [number, number];
    })
    .filter((value): value is [number, number] => Boolean(value));
  return normalized.length ? normalized : null;
};

export interface RouteProps {
  origin: string;
  destination: string;
  distanceMeters: number;
  durationMinutes: number;
  mobilityType: string;
  routeType: string;
  steps: string[];
  consumptionPer100Km?: number | null;
  consumptionUnit?: ConsumptionUnit | null;
  cost?: number;
  currency?: string;
  polyline?: Array<[number, number]> | null;
}

export class Route implements IRouteData {
  private readonly origin: string;
  private readonly destination: string;
  private readonly distanceMeters: number;
  private readonly durationMinutes: number;
  private readonly mobilityType: string;
  private readonly routeType: string;
  private readonly steps: string[];
  private readonly consumptionPer100Km: number | null;
  private readonly consumptionUnit: ConsumptionUnit | null;
  private readonly cost: number;
  private readonly currency: string;
  private readonly polyline: Array<[number, number]> | null;

  constructor(props: RouteProps) {
    this.origin = props.origin;
    this.destination = props.destination;
    this.distanceMeters = props.distanceMeters;
    this.durationMinutes = props.durationMinutes;
    this.mobilityType = props.mobilityType;
    this.routeType = props.routeType;
    this.steps = props.steps;
    this.consumptionPer100Km = props.consumptionPer100Km ?? null;
    this.consumptionUnit = props.consumptionUnit ?? null;
    this.cost = props.cost ?? 0;
    this.currency = props.currency ?? "EUR";
    this.polyline = normalizePolyline(props.polyline);
  }

  getDistance(): number {
    return this.distanceMeters;
  }

  getDistanceUnit(): DistanceUnit {
    return "m";
  }

  getDuration(): number {
    return this.durationMinutes;
  }

  getMobilityType(): string {
    return this.mobilityType;
  }

  getRouteType(): string {
    return this.routeType;
  }

  getSteps(): string[] {
    return this.steps;
  }

  getConsumptionValue(): number | null {
    return this.consumptionPer100Km;
  }

  getConsumptionUnit(): ConsumptionUnit | null {
    return this.consumptionUnit;
  }

  getCost(): number {
    return this.cost;
  }

  getCostCurrency(): string {
    return this.currency;
  }

  getPolyline(): Array<[number, number]> | null {
    if (!this.polyline) return null;
    return this.polyline.map(([lat, lng]) => [lat, lng] as [number, number]);
  }

  toJSON() {
    return {
      origin: this.origin,
      destination: this.destination,
      distance: this.distanceMeters,
      distanceUnit: this.getDistanceUnit(),
      duration: this.durationMinutes,
      mobilityType: this.mobilityType,
      routeType: this.routeType,
      steps: this.steps,
      consumptionPer100Km: this.consumptionPer100Km,
      consumptionUnit: this.consumptionUnit,
      cost: this.cost,
      currency: this.currency,
      polyline: this.getPolyline(),
    };
  }
}
